import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PROJECT_STATUSES = ["pending", "in_progress", "completed"] as const;
const MESSAGE_PRIORITIES = ["NORMAL", "IMPORTANT"] as const;
const ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;

// Configurable counts for bulk data
const BULK = {
  users: 45,        // 5 managers + 40 staff
  projects: 250,
  messages: 80,
  notificationsPerMessage: 8,
  auditLogs: 150,
};

const FIRST_NAMES = [
  "Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Avery",
  "Quinn", "Reese", "Jamie", "Dakota", "Skyler", "Parker", "Cameron", "Drew",
  "Blake", "Finley", "Emery", "Hayden", "River", "Sage", "Rowan", "Phoenix",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore",
  "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark", "Lewis",
];

const PROJECT_PREFIXES = [
  "Dashboard", "API", "Mobile", "Web", "Backend", "Frontend", "Auth", "Billing",
  "Reports", "Settings", "Onboarding", "Search", "Notifications", "Integrations",
  "Analytics", "Export", "Import", "Migration", "Refactor", "Redesign",
];

const MESSAGE_TITLES = [
  "Sprint planning update", "Deployment completed", "Meeting reminder",
  "New feature released", "Bug fix in production", "Documentation updated",
  "Security patch applied", "Performance improvements", "API changes",
  "Database maintenance", "Code review requested", "Release notes",
  "Holiday schedule", "Team lunch", "Training session", "Q4 goals",
];

// 20 parameters of different types for bulk seeding (key, label, type, options for select)
const BULK_PARAMETERS = [
  { key: "dueDate", label: "Due Date", type: "date" as const, options: null as string | null, order: 0 },
  { key: "assignee", label: "Assignee", type: "text" as const, options: null, order: 1 },
  { key: "priority", label: "Priority", type: "select" as const, options: "low,medium,high", order: 2 },
  { key: "effort", label: "Effort (pts)", type: "number" as const, options: null, order: 3 },
  { key: "cost", label: "Cost", type: "number" as const, options: null, order: 4 },
  { key: "startDate", label: "Start Date", type: "date" as const, options: null, order: 5 },
  { key: "endDate", label: "End Date", type: "date" as const, options: null, order: 6 },
  { key: "department", label: "Department", type: "select" as const, options: "eng,design,product,qa,ops", order: 7 },
  { key: "region", label: "Region", type: "select" as const, options: "us,eu,apac", order: 8 },
  { key: "category", label: "Category", type: "select" as const, options: "feature,bug,chore", order: 9 },
  { key: "risk", label: "Risk", type: "select" as const, options: "low,medium,high,critical", order: 10 },
  { key: "owner", label: "Owner", type: "text" as const, options: null, order: 11 },
  { key: "client", label: "Client", type: "text" as const, options: null, order: 12 },
  { key: "budget", label: "Budget", type: "number" as const, options: null, order: 13 },
  { key: "progress", label: "Progress %", type: "number" as const, options: null, order: 14 },
  { key: "phase", label: "Phase", type: "select" as const, options: "discovery,design,dev,qa,launch", order: 15 },
  { key: "tags", label: "Tags", type: "text" as const, options: null, order: 16 },
  { key: "milestone", label: "Milestone", type: "text" as const, options: null, order: 17 },
  { key: "version", label: "Version", type: "text" as const, options: null, order: 18 },
  { key: "severity", label: "Severity", type: "select" as const, options: "P0,P1,P2,P3", order: 19 },
];

const CLIENT_NAMES = ["Acme Corp", "Beta Inc", "Gamma LLC", "Delta Co", "Epsilon Ltd", "Zeta Industries", "Omega Systems"];
const MILESTONE_PREFIXES = ["M1", "M2", "Sprint 1", "Sprint 2", "Release", "Phase 1", "Phase 2"];
const VERSION_PATTERNS = ["1.0", "2.0", "0.9", "1.2.3", "2.1.0"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * daysFromNow) - Math.floor(Math.random() * 30));
  return d.toISOString().slice(0, 10);
}

async function ensureAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@devroad.in";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ejhcmmqh32#A";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin user already exists:", email);
    return existing.id;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { email, passwordHash, name: "Admin", role: "ADMIN" },
  });
  console.log("Created admin user:", email);
  return admin.id;
}

async function ensureParameters(_adminId: string) {
  const created: string[] = [];
  for (const p of BULK_PARAMETERS) {
    const existing = await prisma.projectParameter.findUnique({ where: { key: p.key } });
    if (existing) {
      created.push(existing.id);
      continue;
    }
    const param = await prisma.projectParameter.create({
      data: { key: p.key, label: p.label, type: p.type, options: p.options, order: p.order },
    });
    created.push(param.id);
    for (const role of ROLES) {
      await prisma.fieldPermission.upsert({
        where: {
          projectParameterId_role: { projectParameterId: param.id, role },
        },
        create: {
          projectParameterId: param.id,
          role,
          canView: true,
          canEdit: role === "ADMIN" || role === "MANAGER",
          canUpdate: role === "ADMIN" || role === "MANAGER",
        },
        update: {},
      });
    }
  }
  console.log("Parameters ensured:", created.length);
  return created;
}

function buildRandomCustomFields(users: { id: string; name: string }[]): Record<string, unknown> {
  const customFields: Record<string, unknown> = {};
  const assigneeUser = users.length ? pick(users) : null;
  for (const p of BULK_PARAMETERS) {
    if (p.key === "assignee") {
      customFields[p.key] = assigneeUser?.name ?? null;
      continue;
    }
    switch (p.type) {
      case "date":
        customFields[p.key] = randomDate(90);
        break;
      case "number":
        if (p.key === "effort") customFields[p.key] = Math.floor(Math.random() * 21); // 0-20
        else if (p.key === "cost" || p.key === "budget") customFields[p.key] = Math.floor(Math.random() * 50000) + 1000;
        else if (p.key === "progress") customFields[p.key] = Math.floor(Math.random() * 101); // 0-100
        else customFields[p.key] = Math.floor(Math.random() * 100);
        break;
      case "select":
        const opts = p.options ? p.options.split(",") : [];
        customFields[p.key] = opts.length ? pick(opts) : null;
        break;
      case "text":
      default:
        if (p.key === "owner") customFields[p.key] = users.length ? pick(users).name : null;
        else if (p.key === "client") customFields[p.key] = pick(CLIENT_NAMES);
        else if (p.key === "tags") customFields[p.key] = ["urgent", "backend", "frontend", "api", "bug"][Math.floor(Math.random() * 5)];
        else if (p.key === "milestone") customFields[p.key] = `${pick(MILESTONE_PREFIXES)}-${Math.floor(Math.random() * 10)}`;
        else if (p.key === "version") customFields[p.key] = pick(VERSION_PATTERNS);
        else customFields[p.key] = `value-${Math.random().toString(36).slice(2, 8)}`;
        break;
    }
  }
  return customFields;
}

async function createBulkUsers(adminId: string) {
  const usedEmails = new Set<string>();
  const users: { id: string; name: string }[] = [];
  const existing = await prisma.user.findMany({ select: { id: true, name: true } });
  users.push(...existing.map((u) => ({ id: u.id, name: u.name ?? "User" })));

  const toCreate = BULK.users - users.length;
  if (toCreate <= 0) {
    console.log("Users: using existing", users.length);
    return users;
  }

  const passwordHash = await bcrypt.hash("bulkseed123", 10);
  let created = 0;
  while (created < toCreate) {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const email = `user${Date.now()}.${created}@bulkseed.devroad.in`;
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    const role = created < 5 ? "MANAGER" : "STAFF";
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role },
    });
    users.push({ id: user.id, name: user.name ?? "User" });
    created++;
  }
  console.log("Users created:", users.length);
  return users;
}

async function createBulkProjects(users: { id: string; name: string }[]) {
  const names = new Set<string>();
  const projects: { id: string }[] = [];
  const batchSize = 50;
  let created = 0;

  while (created < BULK.projects) {
    let name: string;
    do {
      name = `${pick(PROJECT_PREFIXES)} ${pick(PROJECT_PREFIXES)} ${created + 1}`;
    } while (names.has(name));
    names.add(name);

    const status = pick(PROJECT_STATUSES);
    const customFields = buildRandomCustomFields(users);

    const p = await prisma.project.create({
      data: {
        name,
        status,
        customFields: customFields as object,
      },
    });
    projects.push({ id: p.id });
    created++;
    if (created % batchSize === 0) console.log("Projects:", created, "/", BULK.projects);
  }
  console.log("Projects created:", projects.length);
  return projects;
}

async function createBulkMessages(userIds: string[]) {
  if (userIds.length === 0) return [];
  const messages: { id: string }[] = [];
  for (let i = 0; i < BULK.messages; i++) {
    const senderId = pick(userIds);
    const msg = await prisma.message.create({
      data: {
        senderId,
        title: `${pick(MESSAGE_TITLES)} #${i + 1}`,
        body: `Bulk seed message body for message ${i + 1}. This simulates real content.`,
        priority: pick(MESSAGE_PRIORITIES),
      },
    });
    messages.push({ id: msg.id });
  }
  console.log("Messages created:", messages.length);
  return messages;
}

async function createBulkNotifications(userIds: string[], messageIds: string[]) {
  if (userIds.length === 0 || messageIds.length === 0) return;
  let count = 0;
  for (const messageId of messageIds) {
    const shuffled = [...userIds].sort(() => Math.random() - 0.5);
    const recipients = shuffled.slice(0, Math.min(BULK.notificationsPerMessage, userIds.length));
    for (const userId of recipients) {
      try {
        await prisma.notification.create({
          data: { userId, messageId, read: Math.random() > 0.6 },
        });
        count++;
      } catch {
        // unique (userId, messageId) - skip duplicate
      }
    }
  }
  console.log("Notifications created:", count);
}

async function createBulkAuditLogs(userIds: string[], projectIds: string[]) {
  const entities = ["project", "user", "message", "parameter", "account"] as const;
  const actions = ["create", "update", "delete"] as const;
  for (let i = 0; i < BULK.auditLogs; i++) {
    const actorId = pick(userIds);
    const entity = pick(entities);
    const entityId = entity === "project" && projectIds.length ? pick(projectIds) : undefined;
    await prisma.auditLog.create({
      data: {
        actorId,
        entity,
        entityId: entityId ?? null,
        action: pick(actions),
        fieldName: Math.random() > 0.5 ? "status" : null,
        oldValue: Math.random() > 0.5 ? "pending" : null,
        newValue: Math.random() > 0.5 ? "in_progress" : null,
      },
    });
  }
  console.log("Audit logs created:", BULK.auditLogs);
}

async function main() {
  console.log("Starting bulk seed...");
  const adminId = await ensureAdmin();
  await ensureParameters(adminId);

  const users = await createBulkUsers(adminId);
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) {
    console.error("No users available for projects/messages.");
    return;
  }

  const projects = await createBulkProjects(users);
  const projectIds = projects.map((p) => p.id);
  const messages = await createBulkMessages(userIds);
  const messageIds = messages.map((m) => m.id);

  await createBulkNotifications(userIds, messageIds);
  await createBulkAuditLogs(userIds, projectIds);

  console.log("Bulk seed done.");
  console.log("Summary: Users:", users.length, "| Projects:", projectIds.length, "| Messages:", messageIds.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
