# Project Management Dashboard

Next.js app with Prisma, PostgreSQL, and NextAuth. Three roles: Admin, Manager, Staff.

## Setup

1. **Start local PostgreSQL with Docker** (uses port **5433** on the host so the default 5432 is free for other apps):

   ```bash
   docker-compose up -d
   ```

2. Copy `.env.example` to `.env` and/or `.env.local` and set:
   - `DATABASE_URL`: e.g. `postgresql://projectman:projectman@localhost:5433/projectman` (Docker Postgres on port 5433). Prisma CLI uses `.env`; the app also loads `.env.local`.
   - `AUTH_SECRET`: Run `openssl rand -base64 32` to generate one.

3. Install dependencies:

   ```bash
   npm install
   ```

4. Run migrations:

   ```bash
   npx prisma migrate dev --name init
   ```

5. Seed the admin user (optional):

   ```bash
   npm run db:seed
   ```
   Default: `admin@example.com` / `admin123`. Override with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

6. Start the app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). Sign in with the seeded admin or create users via Admin → Users.

## Features

- **Login**: Email and password (English).
- **Account**: Update own email, name, and password (old + new required for password change).
- **Dashboard**: Project progress and counts by status.
- **Projects**: List, create, edit; fields driven by admin-defined parameters and permissions.
- **Inbox**: Messages with priority (Normal / Important); filter by priority.
- **Admin**: Users (create/manage Managers and Staff), Project parameters, Field permissions (checkboxes per role), Confidential notes per project, Audit log (every operation stored in DB).

## Tech

- Next.js (App Router), TypeScript, Tailwind CSS
- Prisma 6 + PostgreSQL (standard driver, no adapter)
- NextAuth v5 (credentials, JWT session)
