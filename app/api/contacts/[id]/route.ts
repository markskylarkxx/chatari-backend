// app/api/contacts/[id]/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

interface Params { params: { id: string } }

const UpdateContactSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const contact = await prisma.contact.findUnique({
      where: { id: params.id },
      include: { business: true },
    });

    if (!contact) return errorResponse("Contact not found", 404);
    if (contact.business.ownerId !== user.id) return errorResponse("Forbidden", 403);

    const body = await request.json();
    const parsed = UpdateContactSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const updated = await prisma.contact.update({
      where: { id: params.id },
      data: { name: parsed.data.name },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("[contacts/[id] PATCH] Error:", error);
    return errorResponse("Failed to update contact", 500);
  }
}
