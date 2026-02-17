import { prisma } from "./db";
import { logAudit } from "./audit";
import type { Role } from "@prisma/client";

export async function getProjectsForRole(role: Role) {
  const params = await prisma.projectParameter.findMany({ orderBy: { order: "asc" } });
  const perms = await prisma.fieldPermission.findMany({
    where: { role },
  });
  const viewableParamIds = new Set(
    role === "ADMIN" ? params.map((p) => p.id) : perms.filter((p) => p.canView).map((p) => p.projectParameterId)
  );
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
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
    if (viewableParamIds.has(param.id) && param.key in custom) {
      filtered[param.key] = custom[param.key];
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
