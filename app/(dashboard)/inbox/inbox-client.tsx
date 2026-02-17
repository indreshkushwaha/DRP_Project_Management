"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Message = {
  id: string;
  title: string;
  body: string;
  priority: string;
  createdAt: string;
  sender?: { name: string | null; email: string };
};

export function InboxClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<"all" | "important" | "normal">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url =
      filter === "important"
        ? "/api/messages?priority=IMPORTANT"
        : filter === "normal"
          ? "/api/messages?priority=NORMAL"
          : "/api/messages";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "important", "normal"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              filter === f ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
            }`}
          >
            {f === "all" ? "All" : f === "important" ? "Important" : "Normal"}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-zinc-500">Loading…</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white shadow-sm">
          {messages.map((m) => (
            <li key={m.id} className="hover:bg-zinc-50">
              <Link
                href={`/inbox/${m.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <span className="font-medium text-zinc-900">{m.title}</span>
                  {m.priority === "IMPORTANT" && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                      Important
                    </span>
                  )}
                </div>
                <span className="text-sm text-zinc-500">
                  {m.sender?.name ?? m.sender?.email ?? "—"} ·{" "}
                  {new Date(m.createdAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && messages.length === 0 && (
        <p className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-zinc-500">
          No messages.
        </p>
      )}
      <div className="pt-4">
        <Link
          href="/inbox/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New message
        </Link>
      </div>
    </div>
  );
}
