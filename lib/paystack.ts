// lib/paystack.ts
// Paystack integration for collecting subscription payments in Naira

import type { PaystackInitializeResponse } from "@/types";

const PAYSTACK_BASE = "https://api.paystack.co";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  };
}

// ─── Plan definitions ─────────────────────────────────────────────────────────
// Prices in kobo (Paystack uses the smallest currency unit)
// ₦7,500 = 750000 kobo, ₦15,000 = 1500000 kobo, ₦30,000 = 3000000 kobo

export const PLANS = {
  starter: {
    name: "Starter",
    amountKobo: 750_000,
    amountNaira: 7_500,
    label: "₦7,500/month",
    features: [
      "AI smart replies",
      "500 conversations/month",
      "Order tracking",
      "Basic analytics",
    ],
  },
  growth: {
    name: "Growth",
    amountKobo: 1_500_000,
    amountNaira: 15_000,
    label: "₦15,000/month",
    features: [
      "Everything in Starter",
      "3 agents",
      "2,000 conversations/month",
      "Broadcast campaigns",
    ],
  },
  pro: {
    name: "Pro",
    amountKobo: 3_000_000,
    amountNaira: 30_000,
    label: "₦30,000/month",
    features: [
      "Everything in Growth",
      "Unlimited agents",
      "Unlimited conversations",
      "Priority support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ─── Initialize a payment transaction ─────────────────────────────────────────

export async function initializePayment(
  email: string,
  planKey: PlanKey,
  metadata: Record<string, string> = {}
): Promise<PaystackInitializeResponse> {
  const plan = PLANS[planKey];
  const reference = `whatflow_${planKey}_${Date.now()}`;

  const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      email,
      amount: plan.amountKobo,
      currency: "NGN",
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify`,
      metadata: {
        plan: planKey,
        ...metadata,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Paystack error: ${error}`);
  }

  return response.json() as Promise<PaystackInitializeResponse>;
}

// ─── Verify a transaction after payment ───────────────────────────────────────

export async function verifyPayment(reference: string): Promise<{
  success: boolean;
  plan?: PlanKey;
  email?: string;
}> {
  const response = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${reference}`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    return { success: false };
  }

  const data = await response.json();

  if (data.data?.status !== "success") {
    return { success: false };
  }

  return {
    success: true,
    plan: data.data.metadata?.plan as PlanKey,
    email: data.data.customer?.email,
  };
}

// ─── Format naira for display ──────────────────────────────────────────────────

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}
