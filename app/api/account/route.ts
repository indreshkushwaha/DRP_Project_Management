import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getViewableParamsForRole } from "@/lib/project-service";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, role: true, dashboardColumnKeys: true } as { id: boolean; email: boolean; name: boolean; role: boolean; dashboardColumnKeys: boolean },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const rawUser = user as { dashboardColumnKeys?: unknown };
    const dashboardColumnKeys = rawUser.dashboardColumnKeys as unknown;
    const keysArray = Array.isArray(dashboardColumnKeys) ? (dashboardColumnKeys as string[]) : [];
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      dashboardColumnKeys: keysArray,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Account GET error:", e);
    return NextResponse.json(
      { error: "Failed to load account.", detail: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    return await patchHandler(req);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Account PATCH unhandled error:", e);
    return NextResponse.json(
      { error: "Failed to update account.", detail: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}

async function patchHandler(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { email, name, oldPassword, newPassword, dashboardColumnKeys: bodyColumnKeys } = body as {
    email?: string;
    name?: string;
    oldPassword?: string;
    newPassword?: string;
    dashboardColumnKeys?: string[];
  };

  const updates: {
    email?: string;
    name?: string | null;
    passwordHash?: string;
    dashboardColumnKeys?: string[] | null;
  } = {};
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

  if (Array.isArray(bodyColumnKeys)) {
    const role = getRole(session);
    if (!role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const viewable = await getViewableParamsForRole(role);
      const viewableKeys = new Set(viewable.map((p) => p.key));
      const invalid = bodyColumnKeys.filter((k) => typeof k !== "string" || !viewableKeys.has(k));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: "dashboardColumnKeys contains keys you are not allowed to view." },
          { status: 400 }
        );
      }
      updates.dashboardColumnKeys = bodyColumnKeys;
    } catch (e) {
      console.error("Account PATCH getViewableParamsForRole failed:", e);
      return NextResponse.json(
        { error: "Failed to validate column preference. Please try again." },
        { status: 500 }
      );
    }
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

  const data: Prisma.UserUpdateInput & { dashboardColumnKeys?: string[] | null } = {};
  if (updates.email !== undefined) data.email = updates.email;
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.passwordHash !== undefined) data.passwordHash = updates.passwordHash;
  if (updates.dashboardColumnKeys !== undefined) data.dashboardColumnKeys = updates.dashboardColumnKeys;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: data as Prisma.UserUpdateInput,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Account PATCH update failed:", e);
    return NextResponse.json(
      {
        error: "Failed to update account. Please try again.",
        detail: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }

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

  let updated;
  try {
    updated = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, role: true, dashboardColumnKeys: true } as { id: boolean; email: boolean; name: boolean; role: boolean; dashboardColumnKeys: boolean },
    });
  } catch (e) {
    console.error("Account PATCH read after update failed:", e);
    return NextResponse.json(
      { error: "Account was updated but the response could not be read. Please refresh." },
      { status: 500 }
    );
  }
  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const rawUpdated = updated as { dashboardColumnKeys?: unknown };
  const keysArray = Array.isArray(rawUpdated.dashboardColumnKeys) ? (rawUpdated.dashboardColumnKeys as string[]) : [];
  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    dashboardColumnKeys: keysArray,
  });
}
