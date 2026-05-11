// @ts-nocheck
// lib/groq-api.ts
import Groq from "groq-sdk";
import type { AIReplyContext } from "@/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function buildSystemPrompt(context: AIReplyContext): string {
  const productList =
    context.products.length > 0
      ? context.products
          .map(
            (p) =>
              `  - ${p.name}: ₦${p.price.toLocaleString("en-NG")} — ${
                p.inStock ? "In stock" : "Out of stock"
              }${p.description ? ` (${p.description})` : ""}`
          )
          .join("\n")
      : "  (No products listed yet)";

  return `You are a customer service assistant for ${context.businessName}, a Nigerian small business on WhatsApp.

Your personality: ${context.aiPersonality}

Our products:
${productList}

Rules:
1. Keep replies under 3 sentences — customers are on mobile
2. Be warm and friendly
3. Reply in Pidgin English if the customer writes in Pidgin
4. NEVER invent products or prices not listed above
5. If unsure, say you will check and get back to them
6. No markdown — plain text only, this is WhatsApp
7. Never reveal you are an AI unless directly asked`;
}

export async function generateAIReply(
  context: AIReplyContext,
  incomingMessage: string,
  conversationHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<string> {
  try {
    const recentHistory = conversationHistory.slice(-10);

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // best free model on Groq
      max_tokens: 250,
      temperature: 0.7,
      messages: [
        { role: "system", content: buildSystemPrompt(context) },
        ...recentHistory,
        { role: "user", content: incomingMessage },
      ],
    });

    const reply = response.choices[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty response from Groq");

    return reply;
  } catch (error) {
    console.error("[groq-api] Error:", error);
    return "Thank you for your message! We will get back to you shortly. 🙏";
  }
}

export async function buildAIContext(
  businessId: string
): Promise<AIReplyContext | null> {
  const { prisma } = await import("@/lib/prisma");

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      products: { where: { inStock: true }, orderBy: { name: "asc" } },
    },
  });

  if (!business) return null;

  return {
    businessId: business.id,
    businessName: business.name,
    aiPersonality:
      business.aiPersonality ??
      "Be helpful, warm and professional. Keep replies short.",
    products: business.products.map((p) => ({
      name: p.name,
      price: p.price,
      currency: p.currency,
      inStock: p.inStock,
      description: p.description,
    })),
  };
}

export async function getConversationHistory(
  conversationId: string,
  limit: number = 10
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const { prisma } = await import("@/lib/prisma");

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return messages.map((msg) => ({
    role: msg.direction === "inbound" ? "user" : "assistant",
    content: msg.content,
  }));
}