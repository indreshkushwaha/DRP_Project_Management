"use client";

import { useState, useEffect } from "react";

type Project = Record<string, unknown>;

type Param = { id: string; key: string; label: string; type: string; options?: string | null };

function projectToLastSaved(p: Project): Record<string, string> {
  const out: Record<string, string> = {
    name: String(p.name ?? ""),
    status: String(p.status ?? "pending"),
  };
  for (const [k, v] of Object.entries(p)) {
    if (k !== "name" && k !== "status" && k !== "id" && k !== "createdAt" && k !== "updatedAt" && k !== "confidentialNotes") {
      out[k] = String(v ?? "");
    }
  }
  return out;
}

export function ProjectDetailClient({
  projectId,
  initialProject,
  role,
  canSeeConfidential,
}: {
  projectId: string;
  initialProject: Project;
  role: string;
  canSeeConfidential: boolean;
}) {
  const [project, setProject] = useState(initialProject);
  const [params, setParams] = useState<Param[]>([]);
  const [confidential, setConfidential] = useState(
    String(initialProject.confidentialNotes ?? "")
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [lastSaved, setLastSaved] = useState<Record<string, string>>(() =>
    projectToLastSaved(initialProject)
  );

  useEffect(() => {
    setLastSaved(projectToLastSaved(initialProject));
  }, [projectId]);

  useEffect(() => {
    fetch("/api/parameters")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setParams(Array.isArray(list) ? list : []))
      .catch(() => setParams([]));
  }, []);

  const name = String(project.name ?? "");
  const status = String(project.status ?? "pending");

  async function handleUpdate(field: string, value: string) {
    setMessage(null);
    setSaving(true);
    const body: Record<string, string> = { [field]: value };
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Update failed" });
        setSaving(false);
        return;
      }
      setProject(data);
      setLastSaved((prev) => ({ ...prev, [field]: value }));
      setMessage({ type: "ok", text: "Saved." });
    } catch {
      setMessage({ type: "err", text: "Request failed" });
    }
    setSaving(false);
  }

  async function handleSaveAll() {
    setMessage(null);
    setSaving(true);
    const body: Record<string, unknown> = {
      name: String(project.name ?? "").trim(),
      status: String(project.status ?? "pending").trim(),
    };
    for (const param of params) {
      const v = project[param.key];
      body[param.key] = v === undefined || v === null ? "" : String(v);
    }
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Update failed" });
        setSaving(false);
        return;
      }
      setProject(data);
      setLastSaved(projectToLastSaved(data));
      setMessage({ type: "ok", text: "Saved." });
    } catch {
      setMessage({ type: "err", text: "Request failed" });
    }
    setSaving(false);
  }

  async function handleConfidentialSave() {
    if (!canSeeConfidential) return;
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/confidential`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confidentialNotes: confidential }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "err", text: data.error ?? "Update failed" });
      } else {
        setMessage({ type: "ok", text: "Confidential notes saved." });
      }
    } catch {
      setMessage({ type: "err", text: "Request failed" });
    }
    setSaving(false);
  }

  const inputBase =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400";
  const labelBase = "block text-xs font-semibold uppercase tracking-wide text-zinc-500";

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-200/80 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Details</h2>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <dl className="space-y-5">
          <div>
            <dt className={labelBase}>Name</dt>
            <dd className="mt-1.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (lastSaved.name ?? "")) handleUpdate("name", v);
                }}
                className={inputBase}
              />
            </dd>
          </div>
          <div>
            <dt className={labelBase}>Status</dt>
            <dd className="mt-1.5">
              <select
                value={status}
                onChange={(e) => {
                  const v = e.target.value;
                  setProject((p) => ({ ...p, status: v }));
                  handleUpdate("status", v);
                }}
                className={inputBase}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </dd>
          </div>
          {params.map((param) => {
              const key = param.key;
              const val = project[key];
              const value = String(val ?? "");
              if (param?.type === "date") {
                return (
                  <div key={key}>
                    <dt className={labelBase}>{param.label}</dt>
                    <dd className="mt-1.5">
                      <input
                        type="date"
                        value={value}
                        onChange={(e) =>
                          setProject((p) => ({ ...p, [key]: e.target.value }))
                        }
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== (lastSaved[key] ?? "")) handleUpdate(key, v);
                        }}
                        className={inputBase}
                      />
                    </dd>
                  </div>
                );
              }
              if (param?.type === "select") {
                const opts = (param.options ?? "")
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean);
                return (
                  <div key={key}>
                    <dt className={labelBase}>{param.label}</dt>
                    <dd className="mt-1.5">
                      <select
                        value={value}
                        onChange={(e) => {
                          const v = e.target.value;
                          setProject((p) => ({ ...p, [key]: v }));
                          handleUpdate(key, v);
                        }}
                        className={inputBase}
                      >
                        <option value="">—</option>
                        {opts.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </dd>
                  </div>
                );
              }
              return (
                <div key={key}>
                  <dt className={labelBase}>{param.label}</dt>
                  <dd className="mt-1.5">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setProject((p) => ({ ...p, [key]: e.target.value }))
                      }
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== (lastSaved[key] ?? "")) handleUpdate(key, v);
                      }}
                      className={inputBase}
                    />
                  </dd>
                </div>
              );
            })}
        </dl>
        {message && (
          <p
            className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
      {canSeeConfidential && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-800">
            Confidential notes (Admin only)
          </h2>
          <textarea
            value={confidential}
            onChange={(e) => setConfidential(e.target.value)}
            onBlur={handleConfidentialSave}
            rows={4}
            className="w-full rounded-lg border border-amber-200/80 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>
      )}
    </div>
  );
}
