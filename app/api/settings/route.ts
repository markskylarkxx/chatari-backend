// app/api/settings/route.ts
// Business profile settings and AI configuration
export const dynamic = 'force-dynamic'

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

const UpdateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  aiPersonality: z.string().max(1000).optional(),
  aiEnabled: z.boolean().optional(),
  whatsappPhoneId: z.string().optional(),
  whatsappPhoneNumber: z.string().optional(),
});

// ─── GET /api/settings ────────────────────────────────────────────────────────

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
      select: {
        id: true,
        name: true,
        whatsappPhoneNumber: true,
        whatsappPhoneId: true,
        aiPersonality: true,
        aiEnabled: true,
        plan: true,
        webhookVerifyToken: true,
        createdAt: true,
      },
    });

    if (!business) return errorResponse("Business not found", 404);

    return successResponse({
      ...business,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`,
    });
  } catch (error) {
    console.error("[settings GET] Error:", error);
    return errorResponse("Failed to fetch settings", 500);
  }
}

// ─── PATCH /api/settings ──────────────────────────────────────────────────────

export async function PATCH(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: parsed.data,
    });

    return successResponse({
      id: updated.id,
      name: updated.name,
      whatsappPhoneNumber: updated.whatsappPhoneNumber,
      whatsappPhoneId: updated.whatsappPhoneId,
      aiPersonality: updated.aiPersonality,
      aiEnabled: updated.aiEnabled,
      plan: updated.plan,
    });
  } catch (error) {
    console.error("[settings PATCH] Error:", error);
    return errorResponse("Failed to update settings", 500);
  }
}
