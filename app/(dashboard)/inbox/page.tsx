import { auth } from "@/auth";
import Link from "next/link";
import { InboxClient } from "./inbox-client";

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Inbox</h1>
      <InboxClient />
    </div>
  );
}
