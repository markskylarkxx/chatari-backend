// app/api/auth/callback/route.ts
// Supabase Auth callback — handles email confirmation and OAuth redirects

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Auto-create a Business record for new users on first login
    if (data?.user) {
      const existingBusiness = await prisma.business.findFirst({
        where: { ownerId: data.user.id },
      });

      if (!existingBusiness) {
        await prisma.business.create({
          data: {
            name: "My Business", // user can update in settings
            ownerId: data.user.id,
          },
        });
      }

      // Also ensure the User record exists in our DB
      await prisma.user.upsert({
        where: { id: data.user.id },
        update: { email: data.user.email! },
        create: {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.full_name ?? null,
        },
      });
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
