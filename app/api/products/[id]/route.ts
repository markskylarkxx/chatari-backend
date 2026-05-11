// app/api/products/[id]/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

interface Params { params: { id: string } }

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  price: z.number().positive().optional(),
  inStock: z.boolean().optional(),
});

// ─── PATCH /api/products/[id] ─────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { business: true },
    });

    if (!product) return errorResponse("Product not found", 404);
    if (product.business.ownerId !== user.id) return errorResponse("Forbidden", 403);

    const body = await request.json();
    const parsed = UpdateProductSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    console.error("[products/[id] PATCH] Error:", error);
    return errorResponse("Failed to update product", 500);
  }
}

// ─── DELETE /api/products/[id] ────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: Params
): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { business: true },
    });

    if (!product) return errorResponse("Product not found", 404);
    if (product.business.ownerId !== user.id) return errorResponse("Forbidden", 403);

    await prisma.product.delete({ where: { id: params.id } });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("[products/[id] DELETE] Error:", error);
    return errorResponse("Failed to delete product", 500);
  }
}
