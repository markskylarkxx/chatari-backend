import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
