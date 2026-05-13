// app/api/orders/[id]/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

interface Params { params: { id: string } }

const UpdateOrderSchema = z.object({
  status: z.enum(["pending", "confirmed", "delivered", "cancelled"]),
  notes: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { business: true },
    });

    if (!order) return errorResponse("Order not found", 404);
    if (order.business.ownerId !== user.id) return errorResponse("Forbidden", 403);

    const body = await request.json();
    const parsed = UpdateOrderSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return successResponse(updated);
  } catch (error) {
    console.error("[orders/[id] PATCH] Error:", error);
    return errorResponse("Failed to update order", 500);
  }
}
