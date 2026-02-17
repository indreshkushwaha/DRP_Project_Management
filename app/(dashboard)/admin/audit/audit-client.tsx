"use client";

import { useState, useEffect } from "react";
type Log = {
  id: string;
  entity: string;
  entityId: string | null;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  actor?: { email: string; name: string | null };
};

const LIMIT = 20;

export function AuditClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [actorId, setActorId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [entity, actorId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    if (actorId) params.set("actorId", actorId);
    params.set("page", String(page));
    params.set("limit", String(LIMIT));
    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.logs) {
          setLogs(Array.isArray(data.logs) ? data.logs : []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 0);
        } else {
          setLogs([]);
          setTotal(0);
          setTotalPages(0);
        }
      })
      .finally(() => setLoading(false));
  }, [entity, actorId, page]);

  if (loading && logs.length === 0) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Filter by entity (user, project, …)"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <input
          type="text"
          placeholder="Filter by actor ID"
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-100">
          <thead>
            <tr className="bg-zinc-50/90">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Field</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Old / New</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {logs.map((log) => (
              <tr key={log.id} className="text-sm transition-colors hover:bg-zinc-50/80">
                <td className="whitespace-nowrap px-4 py-2 text-zinc-500">
                  {new Date(log.createdAt).toLocaleString("en-US")}
                </td>
                <td className="px-4 py-2 text-zinc-700">
                  {log.actor?.name ?? log.actor?.email ?? "—"}
                </td>
                <td className="px-4 py-2 text-zinc-700">{log.entity}</td>
                <td className="px-4 py-2 text-zinc-700">{log.action}</td>
                <td className="px-4 py-2 text-zinc-600">{log.fieldName ?? "—"}</td>
                <td className="max-w-xs truncate px-4 py-2 text-zinc-500">
                  {log.oldValue ?? "—"} → {log.newValue ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="px-4 py-8 text-center text-zinc-500">No audit entries.</p>
        )}
      </div>
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
    </div>
  );
}
