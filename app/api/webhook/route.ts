// app/api/webhook/route.ts
// THE HEART OF WHATFLOW — every WhatsApp message passes through here

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, markMessageAsRead } from "@/lib/meta-api";
import { generateAIReply, buildAIContext, getConversationHistory } from "@/lib/groq-api";
import { matchesFlowTrigger } from "@/lib/utils";
import type { MetaWebhookPayload, MetaMessage, FlowStep } from "@/types";

// ─── GET — Meta Webhook Verification ─────────────────────────────────────────
// Meta calls this once when you register the webhook URL.
// Must respond with the challenge string to confirm ownership.

export async function GET(request: NextRequest): Promise<Response> {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken && challenge) {
    console.log("[webhook] Webhook verified successfully");
    return new Response(challenge, { status: 200 });
  }

  console.warn("[webhook] Webhook verification failed", { mode, token });
  return new Response("Forbidden", { status: 403 });
}

// ─── POST — Incoming WhatsApp Messages ───────────────────────────────────────
// Meta sends all events here: new messages, delivery receipts, read receipts.
// CRITICAL: Must return 200 immediately. Never block on AI or DB calls.

export async function POST(request: NextRequest): Promise<Response> {
  // Respond to Meta immediately — they will retry if we take too long
  const body = (await request.json()) as MetaWebhookPayload;

  // Process in the background — don't await
  handleWebhookPayload(body).catch((err) => {
    console.error("[webhook] Background processing error:", err);
  });

  return new Response("OK", { status: 200 });
}

// ─── Main message handler ─────────────────────────────────────────────────────

async function handleWebhookPayload(payload: MetaWebhookPayload): Promise<void> {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      if (!phoneNumberId) continue;

      // Handle incoming messages
      if (value.messages && value.messages.length > 0) {
        for (const message of value.messages) {
          await handleIncomingMessage(message, phoneNumberId).catch((err) => {
            console.error("[webhook] Error handling message:", err);
          });
        }
      }

      // Handle delivery/read status updates
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          await updateMessageStatus(status.id, status.status).catch(() => {});
        }
      }
    }
  }
}

// ─── Handle a single incoming message ────────────────────────────────────────

async function handleIncomingMessage(
  message: MetaMessage,
  phoneNumberId: string
): Promise<void> {
  // Only handle text messages for now
  if (message.type !== "text" || !message.text?.body) {
    console.log(`[webhook] Skipping non-text message type: ${message.type}`);
    return;
  }

  const senderPhone = message.from;
  const messageText = message.text.body.trim();
  const waMessageId = message.id;

  console.log(`[webhook] Message from ${senderPhone}: "${messageText}"`);

  // 1. Find the business that owns this phone number ID
  const business = await prisma.business.findFirst({
    where: { whatsappPhoneId: phoneNumberId },
  });

  if (!business) {
    console.warn(`[webhook] No business found for phoneNumberId: ${phoneNumberId}`);
    return;
  }

  // 2. Find or create the contact
  const contact = await prisma.contact.upsert({
    where: {
      phoneNumber_businessId: {
        phoneNumber: senderPhone,
        businessId: business.id,
      },
    },
    update: {}, // no-op update — just return existing
    create: {
      phoneNumber: senderPhone,
      businessId: business.id,
    },
  });

  // 3. Find or create an open conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      contactId: contact.id,
      businessId: business.id,
      status: "open",
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        businessId: business.id,
        contactId: contact.id,
        status: "open",
      },
    });
  } else {
    // Update the updatedAt timestamp so it appears at top of inbox
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });
  }

  // 4. Save the inbound message (deduplicate by waMessageId)
  const existingMessage = await prisma.message.findUnique({
    where: { waMessageId },
  });

  if (existingMessage) {
    console.log(`[webhook] Duplicate message ${waMessageId} — skipping`);
    return;
  }

  await prisma.message.create({
    data: {
      waMessageId,
      direction: "inbound",
      content: messageText,
      type: "text",
      status: "delivered",
      conversationId: conversation.id,
    },
  });

  // Mark message as read (best effort)
  markMessageAsRead(phoneNumberId, waMessageId);

  // 5. Check if AI is disabled for this business
  if (!business.aiEnabled) {
    console.log(`[webhook] AI disabled for business ${business.id}`);
    return;
  }

  // 6. Check if any Flow trigger matches
  const flows = await prisma.flow.findMany({
    where: { businessId: business.id, isActive: true },
  });

  const matchedFlow = flows.find((flow) =>
    matchesFlowTrigger(messageText, flow.trigger)
  );

  if (matchedFlow) {
    await executeFlow(
      matchedFlow,
      conversation.id,
      phoneNumberId,
      senderPhone,
      business.id
    );
    return;
  }

  // 7. No flow matched — use AI to generate a reply
  const aiContext = await buildAIContext(business.id);
  if (!aiContext) return;

  const history = await getConversationHistory(conversation.id, 10);
  const reply = await generateAIReply(aiContext, messageText, history);

  // Send the reply via WhatsApp
  // await sendWhatsAppMessage(phoneNumberId, senderPhone, reply);

  if (process.env.META_PERMANENT_ACCESS_TOKEN) {
    await sendWhatsAppMessage(phoneNumberId, senderPhone, reply);
  } else {
    console.log(`[webhook] AI reply (Meta not connected yet): "${reply}"`);
  }

  // Save outbound message to DB
  await prisma.message.create({
    data: {
      direction: "outbound",
      content: reply,
      type: "text",
      status: "sent",
      isAiGenerated: true,
      conversationId: conversation.id,
    },
  });

  console.log(`[webhook] AI reply sent to ${senderPhone}`);
}

// ─── Execute a conversation flow ──────────────────────────────────────────────

async function executeFlow(
  flow: { id: string; steps: unknown; name: string },
  conversationId: string,
  phoneNumberId: string,
  recipientPhone: string,
  businessId: string
): Promise<void> {
  const steps = flow.steps as FlowStep[];
  if (!steps || steps.length === 0) return;

  // For MVP: send the first step message
  const firstStep = steps[0];
  if (!firstStep?.message) return;

  await sendWhatsAppMessage(phoneNumberId, recipientPhone, firstStep.message);

  await prisma.message.create({
    data: {
      direction: "outbound",
      content: firstStep.message,
      type: "text",
      status: "sent",
      isAiGenerated: false,
      conversationId,
    },
  });

  console.log(`[webhook] Flow "${flow.id}" executed for conversation ${conversationId}`);
}

// ─── Update message delivery/read status ─────────────────────────────────────

async function updateMessageStatus(
  waMessageId: string,
  status: string
): Promise<void> {
  await prisma.message.updateMany({
    where: { waMessageId },
    data: { status },
  });
}
