import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type AuditEntity =
  | "user"
  | "project"
  | "message"
  | "parameter"
  | "permission"
  | "account"
  | "notification";

export type AuditAction = "create" | "update" | "delete";

export async function logAudit(params: {
  actorId: string;
  entity: AuditEntity;
  entityId?: string | null;
  action: AuditAction;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      entity: params.entity,
      entityId: params.entityId ?? null,
      action: params.action,
      fieldName: params.fieldName ?? null,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      metadata:
        params.metadata === null || params.metadata === undefined
          ? Prisma.JsonNull
          : (params.metadata as Prisma.InputJsonValue),
    },
  });
}
