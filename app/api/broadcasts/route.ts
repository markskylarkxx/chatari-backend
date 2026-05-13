// app/api/broadcasts/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/meta-api";
import { successResponse, errorResponse, sleep } from "@/lib/utils";

const CreateBroadcastSchema = z.object({
  message: z.string().min(1).max(4096),
  sendNow: z.boolean().default(false),
});

// ─── GET /api/broadcasts ──────────────────────────────────────────────────────

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const broadcasts = await prisma.broadcast.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(broadcasts);
  } catch (error) {
    console.error("[broadcasts GET] Error:", error);
    return errorResponse("Failed to fetch broadcasts", 500);
  }
}

// ─── POST /api/broadcasts ─────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    if (!business.whatsappPhoneId) {
      return errorResponse("WhatsApp is not connected. Go to Settings.", 400);
    }

    const body = await request.json();
    const parsed = CreateBroadcastSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    // Create broadcast record
    const broadcast = await prisma.broadcast.create({
      data: {
        message: parsed.data.message,
        status: parsed.data.sendNow ? "sending" : "draft",
        businessId: business.id,
      },
    });

    // Send immediately if requested — run in background
    if (parsed.data.sendNow) {
      sendBroadcast(
        broadcast.id,
        business.id,
        business.whatsappPhoneId,
        parsed.data.message
      ).catch((err) => {
        console.error("[broadcasts] Background send error:", err);
      });
    }

    return successResponse(broadcast, 201);
  } catch (error) {
    console.error("[broadcasts POST] Error:", error);
    return errorResponse("Failed to create broadcast", 500);
  }
}

// ─── Background broadcast sender ──────────────────────────────────────────────
// Sends to all contacts with a 1-second delay between each to respect rate limits

async function sendBroadcast(
  broadcastId: string,
  businessId: string,
  phoneNumberId: string,
  message: string
): Promise<void> {
  const contacts = await prisma.contact.findMany({
    where: { businessId },
    select: { phoneNumber: true },
  });

  let sentCount = 0;
  let failCount = 0;

  for (const contact of contacts) {
    try {
      await sendWhatsAppMessage(phoneNumberId, contact.phoneNumber, message);
      sentCount++;
      // Rate limit — Meta allows ~80 messages/second but we stay safe
      await sleep(1000);
    } catch (err) {
      console.error(`[broadcast] Failed to send to ${contact.phoneNumber}:`, err);
      failCount++;
    }
  }

  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: {
      status: "sent",
      sentCount,
      failCount,
    },
  });

  console.log(
    `[broadcast] ${broadcastId} complete — sent: ${sentCount}, failed: ${failCount}`
  );
}
