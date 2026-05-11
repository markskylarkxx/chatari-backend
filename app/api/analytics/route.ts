// app/api/analytics/route.ts
// Returns all analytics data for the dashboard charts and stat tiles

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/supabase";
import { successResponse, errorResponse } from "@/lib/utils";
import { subDays, startOfDay, format } from "date-fns";

export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const user = await getAuthUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const business = await prisma.business.findFirst({
      where: { ownerId: user.id },
    });
    if (!business) return errorResponse("Business not found", 404);

    const now = new Date();
    const todayStart = startOfDay(now);
    const thirtyDaysAgo = subDays(now, 30);

    // ── Stat tiles ─────────────────────────────────────────────────────────────

    const [
      conversationsToday,
      messagesToday,
      openConversations,
      ordersThisWeek,
      totalContacts,
      totalConversations,
      totalOrdersMonth,
    ] = await Promise.all([
      prisma.conversation.count({
        where: { businessId: business.id, createdAt: { gte: todayStart } },
      }),
      prisma.message.count({
        where: {
          conversation: { businessId: business.id },
          createdAt: { gte: todayStart },
          direction: "inbound",
        },
      }),
      prisma.conversation.count({
        where: { businessId: business.id, status: "open" },
      }),
      prisma.order.count({
        where: {
          businessId: business.id,
          createdAt: { gte: subDays(now, 7) },
        },
      }),
      prisma.contact.count({ where: { businessId: business.id } }),
      prisma.conversation.count({ where: { businessId: business.id } }),
      prisma.order.count({
        where: {
          businessId: business.id,
          createdAt: { gte: subDays(now, 30) },
        },
      }),
    ]);

    // ── Messages per day — last 30 days ────────────────────────────────────────

    const messagesRaw = await prisma.message.findMany({
      where: {
        conversation: { businessId: business.id },
        direction: "inbound",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    });

    // Group by day
    const messagesPerDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const day = format(subDays(now, i), "MMM dd");
      messagesPerDay[day] = 0;
    }
    for (const msg of messagesRaw) {
      const day = format(new Date(msg.createdAt), "MMM dd");
      if (day in messagesPerDay) {
        messagesPerDay[day]++;
      }
    }
    const messagesPerDayChart = Object.entries(messagesPerDay).map(
      ([date, count]) => ({ date, count })
    );

    // ── Messages by hour of day ─────────────────────────────────────────────────

    const hourCounts: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourCounts[h] = 0;

    for (const msg of messagesRaw) {
      const hour = new Date(msg.createdAt).getHours();
      hourCounts[hour]++;
    }
    const messagesByHour = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: `${hour.padStart(2, "0")}:00`,
      count,
    }));

    // ── Recent activity feed — last 10 inbound messages ────────────────────────

    const recentMessages = await prisma.message.findMany({
      where: {
        conversation: { businessId: business.id },
        direction: "inbound",
      },
      include: {
        conversation: {
          include: { contact: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return successResponse({
      stats: {
        conversationsToday,
        messagesToday,
        openConversations,
        ordersThisWeek,
        totalContacts,
        totalConversations,
        totalOrdersMonth,
      },
      charts: {
        messagesPerDay: messagesPerDayChart,
        messagesByHour,
      },
      recentMessages,
    });
  } catch (error) {
    console.error("[analytics GET] Error:", error);
    return errorResponse("Failed to fetch analytics", 500);
  }
}