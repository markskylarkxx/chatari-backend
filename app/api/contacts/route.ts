// app/api/contacts/route.ts + app/api/contacts/[id]/route.ts combined
// Contacts list and name editing

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

// ─── GET /api/contacts ────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") ?? "100");
    const page = parseInt(searchParams.get("page") ?? "1");

    const contacts = await prisma.contact.findMany({
      where: {
        businessId: business.id,
        ...(search
          ? {
              OR: [
                { phoneNumber: { contains: search } },
                { name: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        _count: { select: { conversations: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    const total = await prisma.contact.count({
      where: { businessId: business.id },
    });

    return successResponse({ contacts, total });
  } catch (error) {
    console.error("[contacts GET] Error:", error);
    return errorResponse("Failed to fetch contacts", 500);
  }
}
