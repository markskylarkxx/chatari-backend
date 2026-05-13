// app/api/send-message/route.ts
// Called from the inbox UI when a business owner manually types and sends a reply
export const dynamic = 'force-dynamic'

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/meta-api";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

const SendMessageSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1).max(4096),
});

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const parsed = SendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { conversationId, message } = parsed.data;

    // Load conversation with related data
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        business: true,
      },
    });

    if (!conversation) {
      return errorResponse("Conversation not found", 404);
    }

    // Verify the requesting user owns this business
    if (conversation.business.ownerId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    const { whatsappPhoneId } = conversation.business;
    const recipientPhone = conversation.contact.phoneNumber;

    if (!whatsappPhoneId) {
      return errorResponse(
        "WhatsApp is not connected for this business. Go to Settings to connect.",
        400
      );
    }

    // Send via Meta API
    const metaResponse = await sendWhatsAppMessage(
      whatsappPhoneId,
      recipientPhone,
      message
    );

    // Save outbound message to DB
    const saved = await prisma.message.create({
      data: {
        waMessageId: metaResponse.messages?.[0]?.id,
        direction: "outbound",
        content: message,
        type: "text",
        status: "sent",
        isAiGenerated: false,
        conversationId,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return successResponse(saved, 201);
  } catch (error) {
    console.error("[send-message] Error:", error);
    return errorResponse("Failed to send message", 500);
  }
}
