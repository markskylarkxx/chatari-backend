// app/api/paystack/verify/route.ts
// Called by Paystack after a successful payment to upgrade a business plan

import { NextRequest, NextResponse } from "next/server";
import { verifyPayment } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(
      new URL("/dashboard?payment=failed", request.url)
    );
  }

  try {
    const result = await verifyPayment(reference);

    if (!result.success || !result.plan || !result.email) {
      return NextResponse.redirect(
        new URL("/dashboard?payment=failed", request.url)
      );
    }

    // Update the business plan
    const user = await prisma.user.findUnique({
      where: { email: result.email },
    });

    if (user) {
      await prisma.business.updateMany({
        where: { ownerId: user.id },
        data: { plan: result.plan },
      });
    }

    return NextResponse.redirect(
      new URL(`/dashboard?payment=success&plan=${result.plan}`, request.url)
    );
  } catch (error) {
    console.error("[paystack/verify] Error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?payment=error", request.url)
    );
  }
}
