import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageUsers } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { email, name, role, password } = body as {
    email?: string;
    name?: string;
    role?: "ADMIN" | "MANAGER" | "STAFF";
    password?: string;
  };

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updates: { email?: string; name?: string; role?: "ADMIN" | "MANAGER" | "STAFF"; passwordHash?: string } = {};
  if (typeof email === "string" && email.trim()) {
    updates.email = email.trim().toLowerCase();
  }
  if (typeof name === "string") {
    updates.name = name.trim() || undefined;
  }
  if (role === "ADMIN" || role === "MANAGER" || role === "STAFF") {
    updates.role = role;
  }
  if (typeof password === "string" && password.length >= 6) {
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  if (updates.email && updates.email !== existing.email) {
    await logAudit({
      actorId: session.user.id,
      entity: "user",
      entityId: id,
      action: "update",
      fieldName: "email",
      oldValue: existing.email,
      newValue: updates.email,
    });
  }
  if (updates.role && updates.role !== existing.role) {
    await logAudit({
      actorId: session.user.id,
      entity: "user",
      entityId: id,
      action: "update",
      fieldName: "role",
      oldValue: existing.role,
      newValue: updates.role,
    });
  }
  if (updates.name !== undefined) {
    await logAudit({
      actorId: session.user.id,
      entity: "user",
      entityId: id,
      action: "update",
      fieldName: "name",
      oldValue: existing.name ?? "",
      newValue: updates.name ?? "",
    });
  }
  if (updates.passwordHash) {
    await logAudit({
      actorId: session.user.id,
      entity: "user",
      entityId: id,
      action: "update",
      fieldName: "password",
      oldValue: null,
      newValue: "[changed by admin]",
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !canManageUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  await logAudit({
    actorId: session.user.id,
    entity: "user",
    entityId: id,
    action: "delete",
    oldValue: JSON.stringify({ email: existing.email, role: existing.role }),
  });
  return NextResponse.json({ success: true });
}
