"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Project = Record<string, unknown>;

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
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [confidential, setConfidential] = useState(
    String(initialProject.confidentialNotes ?? "")
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const name = String(project.name ?? "");
  const status = String(project.status ?? "pending");
  const skipKeys = ["id", "name", "status", "createdAt", "updatedAt", "confidentialNotes"];

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
        <h2 className="mb-4 text-sm font-medium text-zinc-500">Details</h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-zinc-500">Name</dt>
            <dd className="mt-0.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
                onBlur={(e) => e.target.value !== name && handleUpdate("name", e.target.value)}
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
          {Object.entries(project)
            .filter(([k]) => !skipKeys.includes(k))
            .map(([key, val]) => (
              <div key={key}>
                <dt className="text-xs text-zinc-500">{key}</dt>
                <dd className="mt-0.5">
                  <input
                    type="text"
                    value={String(val ?? "")}
                    onChange={(e) =>
                      setProject((p) => ({ ...p, [key]: e.target.value }))
                    }
                    onBlur={(e) =>
                      String(project[key]) !== e.target.value &&
                      handleUpdate(key, e.target.value)
                    }
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-zinc-900"
                  />
                </dd>
              </div>
            ))}
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
