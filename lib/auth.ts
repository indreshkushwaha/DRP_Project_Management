import type { Session } from "next-auth";
import { Role } from "@prisma/client";
import { prisma } from "./db";

export function getRole(session: Session | null): Role | null {
  return (session?.user?.role as Role) ?? null;
}

export function isAdmin(session: Session | null): boolean {
  return getRole(session) === "ADMIN";
}

export function canManageUsers(session: Session | null): boolean {
  return isAdmin(session);
}

export function canSeeConfidential(session: Session | null): boolean {
  return isAdmin(session);
}

export function canAccessAdmin(session: Session | null): boolean {
  return isAdmin(session);
}

const fieldPermissionCache = new Map<string, { view: boolean; edit: boolean; update: boolean }>();

export async function getFieldPermission(
  role: Role,
  projectParameterId: string
): Promise<{ canView: boolean; canEdit: boolean; canUpdate: boolean }> {
  const key = `${role}-${projectParameterId}`;
  const cached = fieldPermissionCache.get(key);
  if (cached) {
    return { canView: cached.view, canEdit: cached.edit, canUpdate: cached.update };
  }
  const perm = await prisma.fieldPermission.findUnique({
    where: {
      projectParameterId_role: { projectParameterId, role },
    },
  });
  const result = {
    canView: perm?.canView ?? false,
    canEdit: perm?.canEdit ?? false,
    canUpdate: perm?.canUpdate ?? false,
  };
  fieldPermissionCache.set(key, { view: result.canView, edit: result.canEdit, update: result.canUpdate });
  return result;
}

export function canViewField(role: Role, permission: { canView: boolean }): boolean {
  return role === "ADMIN" || permission.canView;
}

export function canEditField(role: Role, permission: { canEdit: boolean }): boolean {
  return role === "ADMIN" || permission.canEdit;
}

export function canUpdateField(role: Role, permission: { canUpdate: boolean }): boolean {
  return role === "ADMIN" || permission.canUpdate;
}
