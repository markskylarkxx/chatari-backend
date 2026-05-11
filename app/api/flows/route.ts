// app/api/flows/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";

const FlowStepSchema = z.object({
  message: z.string().min(1),
  waitForReply: z.boolean().default(false),
});

const CreateFlowSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.string().min(1).max(100),
  steps: z.array(FlowStepSchema).min(1),
  isActive: z.boolean().default(true),
});

// ─── GET /api/flows ───────────────────────────────────────────────────────────

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const flows = await prisma.flow.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(flows);
  } catch (error) {
    console.error("[flows GET] Error:", error);
    return errorResponse("Failed to fetch flows", 500);
  }
}

// ─── POST /api/flows ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const body = await request.json();
    const parsed = CreateFlowSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400);

    const flow = await prisma.flow.create({
      data: {
        name: parsed.data.name,
        trigger: parsed.data.trigger,
        steps: parsed.data.steps,
        isActive: parsed.data.isActive,
        businessId: business.id,
      },
    });

    return successResponse(flow, 201);
  } catch (error) {
    console.error("[flows POST] Error:", error);
    return errorResponse("Failed to create flow", 500);
  }
}
