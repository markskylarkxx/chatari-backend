// app/api/conversations/[id]/route.ts
// Single conversation — fetch messages, update status

export const dynamic = 'force-dynamic'

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

interface Params {
  params: { id: string };
}

// ─── GET /api/conversations/[id] ─────────────────────────────────────────────
// Returns a single conversation with all its messages

export async function GET(
  _request: NextRequest,
  { params }: Params
): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        business: true,
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) return errorResponse("Conversation not found", 404);

    if (conversation.business.ownerId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    return successResponse(conversation);
  } catch (error) {
    console.error("[conversations/[id] GET] Error:", error);
    return errorResponse("Failed to fetch conversation", 500);
  }
}

// ─── PATCH /api/conversations/[id] ───────────────────────────────────────────
// Update conversation status (open → closed)

export async function PATCH(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { status } = body;

    if (!["open", "closed"].includes(status)) {
      return errorResponse("Invalid status. Must be 'open' or 'closed'", 400);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: { business: true },
    });

    if (!conversation) return errorResponse("Conversation not found", 404);
    if (conversation.business.ownerId !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    const updated = await prisma.conversation.update({
      where: { id: params.id },
      data: { status },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("[conversations/[id] PATCH] Error:", error);
    return errorResponse("Failed to update conversation", 500);
  }
}
