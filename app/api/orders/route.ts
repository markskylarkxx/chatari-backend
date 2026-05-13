// app/api/orders/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

// ─── GET /api/orders ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const page = parseInt(searchParams.get("page") ?? "1");

    const orders = await prisma.order.findMany({
      where: {
        businessId: business.id,
        ...(status ? { status } : {}),
      },
      include: {
        contact: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    const total = await prisma.order.count({
      where: { businessId: business.id },
    });

    return successResponse({ orders, total });
  } catch (error) {
    console.error("[orders GET] Error:", error);
    return errorResponse("Failed to fetch orders", 500);
  }
}
