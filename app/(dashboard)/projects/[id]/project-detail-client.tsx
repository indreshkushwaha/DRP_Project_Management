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

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500">Details</h2>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-zinc-500">Name</dt>
            <dd className="mt-0.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (lastSaved.name ?? "")) handleUpdate("name", v);
                }}
                className="w-full rounded border border-zinc-300 px-2 py-1 text-zinc-900"
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Status</dt>
            <dd className="mt-0.5">
              <select
                value={status}
                onChange={(e) => {
                  const v = e.target.value;
                  setProject((p) => ({ ...p, status: v }));
                  handleUpdate("status", v);
                }}
                className="w-full rounded border border-zinc-300 px-2 py-1 text-zinc-900"
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
                    <dt className="text-xs text-zinc-500">{param.label}</dt>
                    <dd className="mt-0.5">
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
                        className="w-full rounded border border-zinc-300 px-2 py-1 text-zinc-900"
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
                    <dt className="text-xs text-zinc-500">{param.label}</dt>
                    <dd className="mt-0.5">
                      <select
                        value={value}
                        onChange={(e) => {
                          const v = e.target.value;
                          setProject((p) => ({ ...p, [key]: v }));
                          handleUpdate(key, v);
                        }}
                        className="w-full rounded border border-zinc-300 px-2 py-1 text-zinc-900"
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
                  <dt className="text-xs text-zinc-500">{param.label}</dt>
                  <dd className="mt-0.5">
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
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-zinc-900"
                    />
                  </dd>
                </div>
              );
            })}
        </dl>
        {message && (
          <p
            className={`mt-3 text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}
          >
            {message.text}
          </p>
        )}
      </div>
      {canSeeConfidential && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-medium text-amber-800">
            Confidential notes (Admin only)
          </h2>
          <textarea
            value={confidential}
            onChange={(e) => setConfidential(e.target.value)}
            onBlur={handleConfidentialSave}
            rows={4}
            className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-zinc-900"
          />
        </div>
      )}
    </div>
  );
}
