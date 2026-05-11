// lib/utils.ts
// Shared utility functions

import { type ClassValue, clsx } from "clsx";
// import { twMerge } from "tailwindcss-merge";
import { formatDistanceToNow, format } from "date-fns";

// ─── Tailwind class merger (used by shadcn/ui) ────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs); 
  
  //return twMerge(clsx(inputs));
}

// ─── Format naira ─────────────────────────────────────────────────────────────

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

// ─── Format phone number for display ─────────────────────────────────────────
// Converts "2348012345678" → "+234 801 234 5678"

export function formatPhoneNumber(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.startsWith("234") && clean.length === 13) {
    return `+234 ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  }
  return `+${clean}`;
}

// ─── Relative time display ────────────────────────────────────────────────────

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), "h:mm a");
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, h:mm a");
}

// ─── API response helpers ─────────────────────────────────────────────────────

export function successResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(
  message: string,
  status: number = 400
): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Validate Nigerian phone numbers ─────────────────────────────────────────
// Accepts: 08012345678, +2348012345678, 2348012345678

export function normalisePhoneNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  // Already in international format
  if (digits.startsWith("234") && digits.length === 13) {
    return digits;
  }

  // Nigerian local format: 0801...
  if (digits.startsWith("0") && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }

  // Without leading 0: 801...
  if (digits.length === 10 && !digits.startsWith("0")) {
    return `234${digits}`;
  }

  return null;
}

// ─── Truncate text for previews ───────────────────────────────────────────────

export function truncate(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// ─── Check if string matches any flow trigger ─────────────────────────────────

export function matchesFlowTrigger(
  message: string,
  trigger: string
): boolean {
  const normalised = message.toLowerCase().trim();
  const triggerLower = trigger.toLowerCase().trim();

  // Exact match
  if (normalised === triggerLower) return true;

  // Contains the trigger keyword
  if (normalised.includes(triggerLower)) return true;

  return false;
}

// ─── Sleep / delay (for rate limiting) ───────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
