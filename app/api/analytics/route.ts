import { NextRequest } from "next/server";
import { successResponse } from "@/lib/utils";

export async function GET(_request: NextRequest): Promise<Response> {
  return successResponse({ stats: {}, charts: {}, recentMessages: [] });
}
