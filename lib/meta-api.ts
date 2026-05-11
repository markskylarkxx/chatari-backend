// lib/meta-api.ts
// All communication with the Meta WhatsApp Cloud API

import type {
  SendMessagePayload,
  MetaSendMessageResponse,
} from "@/types";

const META_API_VERSION = "v19.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ─── Send a plain text WhatsApp message ──────────────────────────────────────

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  recipientPhone: string,
  text: string
): Promise<MetaSendMessageResponse> {
  const accessToken = process.env.META_PERMANENT_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("META_PERMANENT_ACCESS_TOKEN is not configured");
  }

  // Normalise phone number — strip leading + if present
  const to = recipientPhone.replace(/^\+/, "");

  const payload: SendMessagePayload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  const response = await fetch(
    `${META_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Meta API error ${response.status}: ${errorBody}`
    );
  }

  const data = (await response.json()) as MetaSendMessageResponse;
  return data;
}

// ─── Send a WhatsApp template message (for broadcast / first-contact) ────────
// Note: Template messages are required when messaging a user outside the
// 24-hour customer service window. For now this is a placeholder — you must
// create approved templates in Meta Business Manager first.

export async function sendWhatsAppTemplate(
  phoneNumberId: string,
  recipientPhone: string,
  templateName: string,
  languageCode: string = "en"
): Promise<MetaSendMessageResponse> {
  const accessToken = process.env.META_PERMANENT_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("META_PERMANENT_ACCESS_TOKEN is not configured");
  }

  const to = recipientPhone.replace(/^\+/, "");

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  };

  const response = await fetch(
    `${META_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Meta API error ${response.status}: ${errorBody}`
    );
  }

  return response.json() as Promise<MetaSendMessageResponse>;
}

// ─── Mark a message as read ──────────────────────────────────────────────────

export async function markMessageAsRead(
  phoneNumberId: string,
  waMessageId: string
): Promise<void> {
  const accessToken = process.env.META_PERMANENT_ACCESS_TOKEN;
  if (!accessToken) return;

  await fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: waMessageId,
    }),
  }).catch((err) => {
    // Non-critical — log and continue
    console.error("[meta-api] Failed to mark message as read:", err);
  });
}

// ─── Get phone number info ────────────────────────────────────────────────────

export async function getPhoneNumberInfo(phoneNumberId: string) {
  const accessToken = process.env.META_PERMANENT_ACCESS_TOKEN;
  if (!accessToken) throw new Error("META_PERMANENT_ACCESS_TOKEN not set");

  const response = await fetch(
    `${META_API_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Meta API error: ${response.status}`);
  }

  return response.json();
}
