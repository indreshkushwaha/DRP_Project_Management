"use client";

import { useState, useEffect } from "react";

type Param = { id: string; key: string; label: string };
type Perm = {
  id: string;
  projectParameterId: string;
  role: string;
  canView: boolean;
  canEdit: boolean;
  canUpdate: boolean;
  projectParameter?: Param;
};
const ROLES = ["ADMIN", "MANAGER", "STAFF"];

export function PermissionsClient() {
  const [params, setParams] = useState<Param[]>([]);
  const [permissions, setPermissions] = useState<Perm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/parameters").then((r) => r.json()),
      fetch("/api/admin/permissions").then((r) => r.json()),
    ])
      .then(([paramsData, permsData]) => {
        setParams(Array.isArray(paramsData) ? paramsData : []);
        setPermissions(Array.isArray(permsData) ? permsData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const getPerm = (paramId: string, role: string) =>
    permissions.find((p) => p.projectParameterId === paramId && p.role === role);

  function setPerm(
    paramId: string,
    role: string,
    field: "canView" | "canEdit" | "canUpdate",
    value: boolean
  ) {
    const existing = getPerm(paramId, role);
    if (existing) {
      setPermissions((prev) =>
        prev.map((p) =>
          p.projectParameterId === paramId && p.role === role ? { ...p, [field]: value } : p
        )
      );
    } else {
      setPermissions((prev) => [
        ...prev,
        {
          id: "",
          projectParameterId: paramId,
          role,
          canView: field === "canView" ? value : false,
          canEdit: field === "canEdit" ? value : false,
          canUpdate: field === "canUpdate" ? value : false,
        },
      ]);
    }
  }

  async function handleSave() {
    setSaving(true);
    const payload = permissions.map((p) => ({
      projectParameterId: p.projectParameterId,
      role: p.role,
      canView: p.canView,
      canEdit: p.canEdit,
      canUpdate: p.canUpdate,
    }));
    await fetch("/api/admin/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: payload }),
    });
    const res = await fetch("/api/admin/permissions");
    const data = await res.json();
    setPermissions(Array.isArray(data) ? data : []);
    setSaving(false);
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Parameter</th>
              {ROLES.map((role) => (
                <th key={role} className="px-4 py-3 text-center text-xs font-medium uppercase text-zinc-500">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {params.map((param) => (
              <tr key={param.id}>
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {param.label} <span className="font-mono text-zinc-400">({param.key})</span>
                </td>
                {ROLES.map((role) => {
                  const perm = getPerm(param.id, role);
                  const view = perm?.canView ?? false;
                  const edit = perm?.canEdit ?? false;
                  const update = perm?.canUpdate ?? false;
                  return (
                    <td key={role} className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={role === "ADMIN" || view}
                            disabled={role === "ADMIN"}
                            onChange={(e) => setPerm(param.id, role, "canView", e.target.checked)}
                          />
                          View
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={role === "ADMIN" || edit}
                            disabled={role === "ADMIN"}
                            onChange={(e) => setPerm(param.id, role, "canEdit", e.target.checked)}
                          />
                          Edit
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={role === "ADMIN" || update}
                            disabled={role === "ADMIN"}
                            onChange={(e) => setPerm(param.id, role, "canUpdate", e.target.checked)}
                          />
                          Update
                        </label>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {params.length === 0 && (
          <p className="px-4 py-8 text-center text-zinc-500">Add parameters first in the Parameters page.</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save permissions"}
      </button>
    </div>
  );
}
