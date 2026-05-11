// app/api/conversations/route.ts
// CRUD for conversations + messages within a conversation

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

// ─── GET /api/conversations ───────────────────────────────────────────────────
// Returns all conversations for the authenticated user's business

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status"); // "open" | "closed"
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const page = parseInt(searchParams.get("page") ?? "1");
    const skip = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      where: {
        businessId: business.id,
        ...(status ? { status } : {}),
      },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // only last message for preview
        },
        _count: {
          select: {
            messages: {
              where: {
                direction: "inbound",
                status: { not: "read" },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip,
    });

    const total = await prisma.conversation.count({
      where: {
        businessId: business.id,
        ...(status ? { status } : {}),
      },
    });

    return successResponse({ conversations, total, page, limit });
  } catch (error) {
    console.error("[conversations GET] Error:", error);
    return errorResponse("Failed to fetch conversations", 500);
  }
}

// ─── POST /api/conversations ──────────────────────────────────────────────────
// Creates a new conversation or adds a message to existing conversation

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const body = await request.json();
    const { contactPhone, contactName, message } = body;

    if (!contactPhone || !message) {
      return errorResponse("contactPhone and message are required", 400);
    }

    // Find or create contact
    let contact = await prisma.contact.findFirst({
      where: {
        phoneNumber: contactPhone,
        businessId: business.id,
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phoneNumber: contactPhone,
          name: contactName || null,
          businessId: business.id,
        },
      });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        businessId: business.id,
        contactId: contact.id,
        status: "open",
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId: business.id,
          contactId: contact.id,
          status: "open",
        },
      });
    }

    // Create the message
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "inbound",
        content: message,
        type: "text",
        status: "sent",
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return successResponse({
      conversation,
      message: newMessage,
      contact,
    });
  } catch (error) {
    console.error("[conversations POST] Error:", error);
    return errorResponse("Failed to create conversation", 500);
  }
}

// ─── GET /api/conversations/[id]/messages ─────────────────────────────────────
// Handled by the dynamic route