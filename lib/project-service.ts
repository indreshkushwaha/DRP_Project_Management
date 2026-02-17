import { prisma } from "./db";
import { logAudit } from "./audit";
import type { Role } from "@prisma/client";

export type ViewableParam = { id: string; key: string; label: string };

export async function getViewableParamsForRole(role: Role): Promise<ViewableParam[]> {
  const params = await prisma.projectParameter.findMany({ orderBy: { order: "asc" } });
  const perms = await prisma.fieldPermission.findMany({ where: { role } });
  const viewableParamIds = new Set(
    role === "ADMIN" ? params.map((p) => p.id) : perms.filter((p) => p.canView).map((p) => p.projectParameterId)
  );
  return params.filter((p) => viewableParamIds.has(p.id)).map((p) => ({ id: p.id, key: p.key, label: p.label }));
}

export async function getDashboardColumnKeys(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { dashboardColumnKeys: true },
  });
  if (!user?.dashboardColumnKeys) return [];
  const arr = user.dashboardColumnKeys as unknown;
  return Array.isArray(arr) ? (arr as string[]) : [];
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export type GetProjectsOptions = {
  page?: number;
  limit?: number;
  filters?: Record<string, string>;
  allowedFilterKeys?: Set<string>;
};

function buildWhereFromFilters(
  filters: Record<string, string> | undefined,
  allowedFilterKeys: Set<string> | undefined
):
  | { status?: string; customFields?: { path: string[]; equals: string }; AND?: unknown[] }
  | undefined {
  if (!filters || !allowedFilterKeys || Object.keys(filters).length === 0) return undefined;
  const conditions: Array<{ status?: string; customFields?: { path: string[]; equals: string } }> = [];
  for (const [key, value] of Object.entries(filters)) {
    const val = value?.trim();
    if (!allowedFilterKeys.has(key) || val === "") continue;
    if (key === "status") {
      conditions.push({ status: val });
    } else {
      conditions.push({ customFields: { path: [key], equals: val } });
    }
  }
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { AND: conditions };
}

export async function getProjectsCountForRole(
  _role: Role,
  options?: { filters?: Record<string, string>; allowedFilterKeys?: Set<string> }
): Promise<number> {
  const where = buildWhereFromFilters(options?.filters, options?.allowedFilterKeys);
  return prisma.project.count({ where: where ?? undefined });
}

export async function getProjectsForRole(role: Role, options?: GetProjectsOptions) {
  const params = await prisma.projectParameter.findMany({ orderBy: { order: "asc" } });
  const perms = await prisma.fieldPermission.findMany({
    where: { role },
  });
  const viewableParamIds = new Set(
    role === "ADMIN" ? params.map((p) => p.id) : perms.filter((p) => p.canView).map((p) => p.projectParameterId)
  );
  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, options?.limit ?? DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;
  const where = buildWhereFromFilters(options?.filters, options?.allowedFilterKeys);
  const projects = await prisma.project.findMany({
    where: where ?? undefined,
    orderBy: { updatedAt: "desc" },
    skip,
    take: limit,
  });
  return projects.map((p) => {
    const custom = (p.customFields as Record<string, unknown>) ?? {};
    const filtered: Record<string, unknown> = {};
    for (const param of params) {
      if (viewableParamIds.has(param.id) && param.key in custom) {
        filtered[param.key] = custom[param.key];
      }
    }
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      ...filtered,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });
}

export async function getProjectByIdForRole(projectId: string, role: Role, includeConfidential: boolean) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  const params = await prisma.projectParameter.findMany({ orderBy: { order: "asc" } });
  const perms = await prisma.fieldPermission.findMany({
    where: { role },
  });
  const viewableParamIds = new Set(
    role === "ADMIN" ? params.map((p) => p.id) : perms.filter((p) => p.canView).map((p) => p.projectParameterId)
  );
  const custom = (project.customFields as Record<string, unknown>) ?? {};
  const filtered: Record<string, unknown> = {};
  for (const param of params) {
    if (viewableParamIds.has(param.id)) {
      filtered[param.key] = custom[param.key] ?? null;
    }
  }
  const result: Record<string, unknown> = {
    id: project.id,
    name: project.name,
    status: project.status,
    ...filtered,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  if (includeConfidential && role === "ADMIN") {
    result.confidentialNotes = project.confidentialNotes;
  }
  return result;
}

export async function createProject(
  data: { name: string; status?: string; [key: string]: unknown },
  actorId: string,
  role: Role
) {
  const { name, status = "pending", ...rest } = data;
  const params = await prisma.projectParameter.findMany();
  const perms = await prisma.fieldPermission.findMany({ where: { role } });
  const canEditKeys = new Set(
    role === "ADMIN" ? params.map((p) => p.key) : perms.filter((p) => p.canEdit || p.canUpdate).map((p) => {
      const param = params.find((x) => x.id === p.projectParameterId);
      return param?.key;
    }).filter(Boolean) as string[]
  );
  const customFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (key !== "confidentialNotes" && canEditKeys.has(key)) {
      customFields[key] = value;
    }
  }
  for (const key of canEditKeys) {
    if (!(key in customFields)) {
      customFields[key] = null;
    }
  }
  const project = await prisma.project.create({
    data: {
      name: String(name).trim(),
      status: String(status || "pending").trim(),
      customFields,
    },
  });
  await logAudit({
    actorId,
    entity: "project",
    entityId: project.id,
    action: "create",
    newValue: JSON.stringify({ name: project.name, status: project.status }),
  });
  return project;
}

export async function updateProject(
  projectId: string,
  data: Record<string, unknown>,
  actorId: string,
  role: Role
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  const params = await prisma.projectParameter.findMany();
  const perms = await prisma.fieldPermission.findMany({ where: { role } });
  const canEditKeys = new Set(
    role === "ADMIN" ? params.map((p) => p.key) : perms.filter((p) => p.canEdit || p.canUpdate).map((p) => {
      const param = params.find((x) => x.id === p.projectParameterId);
      return param?.key;
    }).filter(Boolean) as string[]
  );
  const currentCustom = (project.customFields as Record<string, unknown>) ?? {};
  const updates: Record<string, unknown> = {};

  if (data.name !== undefined) {
    const newName = String(data.name).trim();
    if (newName !== project.name) {
      await logAudit({
        actorId,
        entity: "project",
        entityId: projectId,
        action: "update",
        fieldName: "name",
        oldValue: project.name,
        newValue: newName,
      });
      updates.name = newName;
    }
  }
  if (data.status !== undefined) {
    const newStatus = String(data.status).trim();
    if (newStatus !== project.status) {
      await logAudit({
        actorId,
        entity: "project",
        entityId: projectId,
        action: "update",
        fieldName: "status",
        oldValue: project.status,
        newValue: newStatus,
      });
      updates.status = newStatus;
    }
  }
  for (const param of params) {
    if (data[param.key] !== undefined && canEditKeys.has(param.key)) {
      const oldVal = currentCustom[param.key];
      const newVal = data[param.key];
      const oldStr = oldVal === undefined ? "" : String(oldVal);
      const newStr = newVal === undefined ? "" : String(newVal);
      if (oldStr !== newStr) {
        await logAudit({
          actorId,
          entity: "project",
          entityId: projectId,
          action: "update",
          fieldName: param.key,
          oldValue: oldStr,
          newValue: newStr,
        });
        currentCustom[param.key] = newVal;
      }
    }
  }
  if (Object.keys(updates).length > 0 || Object.keys(currentCustom).length > 0) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(updates as { name?: string; status?: string }),
        customFields: currentCustom,
      },
    });
  }
  return prisma.project.findUnique({ where: { id: projectId } });
}
