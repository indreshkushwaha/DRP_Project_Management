import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const list = await prisma.projectParameter.findMany({
    orderBy: { order: "asc" },
    select: { id: true, key: true, label: true, type: true, order: true },
  });
  return NextResponse.json(list);
}
