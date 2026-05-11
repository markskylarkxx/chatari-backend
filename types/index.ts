// types/index.ts
// Shared TypeScript types across the WhatFlow backend

// ─── Meta / WhatsApp ────────────────────────────────────────────────────────

export interface MetaWebhookPayload {
  object: string;
  entry: MetaEntry[];
}

export interface MetaEntry {
  id: string;
  changes: MetaChange[];
}

export interface MetaChange {
  value: MetaChangeValue;
  field: string;
}

export interface MetaChangeValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}

export interface MetaContact {
  profile: { name: string };
  wa_id: string;
}

export interface MetaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { caption?: string; mime_type: string; sha256: string; id: string };
  audio?: { mime_type: string; sha256: string; id: string; voice: boolean };
}

export interface MetaStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string }[];
}

export interface SendMessagePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: { body: string };
}

export interface MetaSendMessageResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

// ─── Business / Internal ────────────────────────────────────────────────────

export interface ProductItem {
  name: string;
  price: number;
  qty: number;
}

export interface FlowStep {
  message: string;
  waitForReply: boolean;
}

export interface AIReplyContext {
  businessId: string;
  businessName: string;
  aiPersonality: string;
  products: {
    name: string;
    price: number;
    currency: string;
    inStock: boolean;
    description?: string | null;
  }[];
}

// ─── API Request / Response shapes ──────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  inStock?: boolean;
}

export interface UpdateOrderStatusRequest {
  status: "pending" | "confirmed" | "delivered" | "cancelled";
}

export interface CreateFlowRequest {
  name: string;
  trigger: string;
  steps: FlowStep[];
}

export interface CreateBroadcastRequest {
  message: string;
  scheduledAt?: string;
}

export interface UpdateContactNameRequest {
  name: string;
}

export interface UpdateBusinessSettingsRequest {
  name?: string;
  aiPersonality?: string;
  aiEnabled?: boolean;
}

// ─── Paystack ───────────────────────────────────────────────────────────────

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}
