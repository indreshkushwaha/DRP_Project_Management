import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["ADMIN", "MANAGER", "STAFF"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !canAccessAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const permissions = await prisma.fieldPermission.findMany({
    include: { projectParameter: true },
  });
  return NextResponse.json(permissions);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !canAccessAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { permissions: input } = body as {
    permissions?: Array<{
      projectParameterId: string;
      role: Role;
      canView?: boolean;
      canEdit?: boolean;
      canUpdate?: boolean;
    }>;
  };
  if (!Array.isArray(input)) {
    return NextResponse.json({ error: "permissions array required." }, { status: 400 });
  }
  for (const p of input) {
    if (!p.projectParameterId || !ROLES.includes(p.role)) continue;
    const existing = await prisma.fieldPermission.findUnique({
      where: {
        projectParameterId_role: {
          projectParameterId: p.projectParameterId,
          role: p.role,
        },
      },
    });
    const data = {
      canView: !!p.canView,
      canEdit: !!p.canEdit,
      canUpdate: !!p.canUpdate,
    };
    if (existing) {
      await prisma.fieldPermission.update({
        where: {
          projectParameterId_role: {
            projectParameterId: p.projectParameterId,
            role: p.role,
          },
        },
        data,
      });
      await logAudit({
        actorId: session.user.id,
        entity: "permission",
        entityId: existing.id,
        action: "update",
        newValue: JSON.stringify(data),
      });
    } else {
      const created = await prisma.fieldPermission.create({
        data: {
          projectParameterId: p.projectParameterId,
          role: p.role,
          ...data,
        },
      });
      await logAudit({
        actorId: session.user.id,
        entity: "permission",
        entityId: created.id,
        action: "create",
        newValue: JSON.stringify(data),
      });
    }
  }
  const permissions = await prisma.fieldPermission.findMany({
    include: { projectParameter: true },
  });
  return NextResponse.json(permissions);
}
