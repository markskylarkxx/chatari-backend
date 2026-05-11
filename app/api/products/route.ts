// app/api/products/route.ts
// Products CRUD — these feed the AI so it knows what to recommend and quote

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

const CreateProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive("Price must be greater than 0"),
  inStock: z.boolean().default(true),
});

// ─── GET /api/products ────────────────────────────────────────────────────────

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const products = await prisma.product.findMany({
      where: { businessId: business.id },
      orderBy: { name: "asc" },
    });

    return successResponse(products);
  } catch (error) {
    console.error("[products GET] Error:", error);
    return errorResponse("Failed to fetch products", 500);
  }
}

// ─── POST /api/products ───────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const body = await request.json();
    const parsed = CreateProductSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        businessId: business.id,
        currency: "NGN",
      },
    });

    return successResponse(product, 201);
  } catch (error) {
    console.error("[products POST] Error:", error);
    return errorResponse("Failed to create product", 500);
  }
}
