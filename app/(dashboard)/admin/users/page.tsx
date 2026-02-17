import { auth } from "@/auth";
import { canAccessAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session)) redirect("/dashboard");
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Users</h1>
      <UsersClient />
    </div>
  );
}
