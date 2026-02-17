import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { MessagePriority } from "@prisma/client";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const priority = searchParams.get("priority") as MessagePriority | null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const where: { priority?: MessagePriority } = {};
  if (priority === "NORMAL" || priority === "IMPORTANT") {
    where.priority = priority;
  }
  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.message.count({ where }),
  ]);
  const totalPages = Math.ceil(total / limit);
  return NextResponse.json({ messages, total, page, limit, totalPages });
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
