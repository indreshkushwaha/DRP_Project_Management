import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { MessagePriority } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const priority = searchParams.get("priority") as MessagePriority | null;
  const where: { priority?: MessagePriority } = {};
  if (priority === "NORMAL" || priority === "IMPORTANT") {
    where.priority = priority;
  }
  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { title, body: messageBody, priority } = body as {
    title?: string;
    body?: string;
    priority?: "NORMAL" | "IMPORTANT";
  };
  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  const prio: MessagePriority = priority === "IMPORTANT" ? "IMPORTANT" : "NORMAL";
  const message = await prisma.message.create({
    data: {
      senderId: session.user.id,
      title: String(title).trim(),
      body: String(messageBody ?? "").trim(),
      priority: prio,
    },
  });
  await logAudit({
    actorId: session.user.id,
    entity: "message",
    entityId: message.id,
    action: "create",
    newValue: JSON.stringify({ title: message.title, priority: message.priority }),
  });
  const users = await prisma.user.findMany({
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      messageId: message.id,
    })),
  });
  return NextResponse.json(message);
}
