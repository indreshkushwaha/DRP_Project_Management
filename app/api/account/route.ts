import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { email, name, oldPassword, newPassword } = body as {
    email?: string;
    name?: string;
    oldPassword?: string;
    newPassword?: string;
  };

  const updates: { email?: string; name?: string; passwordHash?: string } = {};
  if (typeof email === "string" && email.trim()) {
    updates.email = email.trim().toLowerCase();
  }
  if (typeof name === "string") {
    updates.name = name.trim() || null;
  }
  if (typeof newPassword === "string" && newPassword.length > 0) {
    if (typeof oldPassword !== "string" || oldPassword.length === 0) {
      return NextResponse.json(
        { error: "Current password is required to set a new password." },
        { status: 400 }
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 }
    );
  }

  const before = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (!before) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updates,
  });

  if (updates.email && updates.email !== before.email) {
    await logAudit({
      actorId: session.user.id,
      entity: "account",
      entityId: session.user.id,
      action: "update",
      fieldName: "email",
      oldValue: before.email,
      newValue: updates.email,
    });
  }
  if (updates.name !== undefined && updates.name !== before.name) {
    await logAudit({
      actorId: session.user.id,
      entity: "account",
      entityId: session.user.id,
      action: "update",
      fieldName: "name",
      oldValue: before.name ?? "",
      newValue: updates.name ?? "",
    });
  }
  if (updates.passwordHash) {
    await logAudit({
      actorId: session.user.id,
      entity: "account",
      entityId: session.user.id,
      action: "update",
      fieldName: "password",
      oldValue: null,
      newValue: "[changed]",
    });
  }

  const updated = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  return NextResponse.json(updated);
}
