import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const notif = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!notif) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  return NextResponse.json({ success: true });
}
