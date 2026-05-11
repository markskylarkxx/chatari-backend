// lib/supabase.ts
// Supabase client helpers — server-side and browser-side

import { createClient } from "@supabase/supabase-js";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Browser client (use in client components) ───────────────────────────────
export const createBrowserClient = () =>
  createClient(supabaseUrl, supabaseAnonKey);

// ─── Server component client (use in server components & API routes) ─────────
export const createSupabaseServerClient = () =>
  createServerComponentClient({ cookies });

// ─── Admin client (bypasses RLS — only use in trusted server-side code) ──────
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helper: get authenticated user from server context ──────────────────────
// export async function getAuthUser() {
//   const supabase = createSupabaseServerClient();
//   const {
//     data: { user },
//     error,
//   } = await supabase.auth.getUser();

//   if (error || !user) return null;
//   return user;
// }


// TEMPORARY — bypass auth for development
// TODO: remove this before going to production
export async function getAuthUser() {
  return { id: "dev-user-id", email: "dev@chatari.com" };
}

// ─── Helper: get the business for the current session user ───────────────────
export async function getSessionBusiness() {
  const user = await getAuthUser();
  if (!user) return null;

  const { prisma } = await import("@/lib/prisma");
  const business = await prisma.business.findFirst({
    where: { ownerId: user.id },
  });

  return business;
}
