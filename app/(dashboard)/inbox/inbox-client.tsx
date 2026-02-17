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

const LIMIT = 20;

export function InboxClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<"all" | "important" | "normal">("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "important") params.set("priority", "IMPORTANT");
    if (filter === "normal") params.set("priority", "NORMAL");
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    fetch(`/api/messages?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.messages) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 0);
        } else {
          setMessages([]);
          setTotal(0);
          setTotalPages(0);
        }
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["all", "important", "normal"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                filter === f ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {f === "all" ? "All" : f === "important" ? "Important" : "Normal"}
            </button>
          ))}
        </div>
        <Link
          href="/inbox/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
        >
          New message
        </Link>
      </div>
      {loading && messages.length === 0 ? (
        <p className="text-zinc-500">Loading…</p>
      ) : (
        <>
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white shadow-sm">
            {messages.map((m) => (
              <li key={m.id} className="transition-colors hover:bg-zinc-50/80">
                <Link
                  href={`/inbox/${m.id}`}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-zinc-900">{m.title}</span>
                    {m.priority === "IMPORTANT" && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Important
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-zinc-500">
                    {m.sender?.name ?? m.sender?.email ?? "—"} ·{" "}
                    {new Date(m.createdAt).toLocaleDateString("en-US")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!loading && messages.length === 0 && (
            <p className="rounded-xl border border-zinc-200/80 bg-white p-8 text-center text-zinc-500">
              No messages.
            </p>
          )}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-zinc-600">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <nav className="flex items-center gap-2" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Previous
                </button>
                <span className="px-3 text-sm text-zinc-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}
