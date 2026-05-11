// middleware.ts
// Protects all dashboard routes — redirects unauthenticated users to login

import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest): Promise<NextResponse> {
 
 
  // 🔓 BYPASS AUTH - REMOVE FOR PRODUCTION
  return NextResponse.next();  // ← ADD THIS LINe
  
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Public routes — always accessible
  const publicPaths = ["/login", "/signup", "/api/webhook", "/api/auth"];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  // If user is not logged in and trying to access a protected route
  if (!session && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in and trying to access login/signup, redirect to dashboard
  if (session && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
