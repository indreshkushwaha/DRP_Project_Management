import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { email, password, name, role } = body as {
    email?: string;
    password?: string;
    name?: string;
    role?: "ADMIN" | "MANAGER" | "STAFF";
  };
  if (!email?.trim() || !password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Valid email and password (min 6 characters) are required." },
      { status: 400 }
    );
  }
  const validRole = role === "ADMIN" || role === "MANAGER" || role === "STAFF" ? role : "STAFF";
  const emailNorm = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: emailNorm,
      passwordHash,
      name: name?.trim() || null,
      role: validRole,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  await logAudit({
    actorId: session.user.id,
    entity: "user",
    entityId: user.id,
    action: "create",
    newValue: JSON.stringify({ email: user.email, role: user.role }),
  });
  return NextResponse.json(user);
}
