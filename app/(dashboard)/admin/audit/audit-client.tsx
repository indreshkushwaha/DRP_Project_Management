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

export function AuditClient() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [actorId, setActorId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (entity) params.set("entity", entity);
    if (actorId) params.set("actorId", actorId);
    fetch(`/api/audit?${params}`)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [entity, actorId]);

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Filter by entity (user, project, …)"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <input
          type="text"
          placeholder="Filter by actor ID"
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Entity</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Field</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Old / New</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {logs.map((log) => (
              <tr key={log.id} className="text-sm">
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
    </div>
  );
}
