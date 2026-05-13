import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      whatsappPhoneId: true,
      aiEnabled: true,
    }
  });
  
  return NextResponse.json({ businesses });
}
