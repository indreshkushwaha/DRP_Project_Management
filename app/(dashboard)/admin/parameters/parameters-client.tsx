"use client";

import { useState, useEffect } from "react";

type Param = { id: string; key: string; label: string; type: string; order: number; options?: string | null };

export function ParametersClient() {
  const [params, setParams] = useState<Param[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Param | "new" | null>(null);
  const [form, setForm] = useState({ key: "", label: "", type: "text", order: 0, options: "" });
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/parameters")
      .then((r) => r.json())
      .then((data) => setParams(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const optionsNorm = form.options
      .split(/[,\n]/)
      .map((o) => o.trim())
      .filter(Boolean)
      .join(",");
    const res = await fetch("/api/admin/parameters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: form.key,
        label: form.label,
        type: form.type,
        order: form.order,
        options: form.type === "select" ? optionsNorm : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setModal(null);
    setForm({ key: "", label: "", type: "text", order: 0, options: "" });
    load();
  }

  async function handleUpdate(e: React.FormEvent, param: Param) {
    e.preventDefault();
    setError("");
    const target = e.target as HTMLFormElement;
    const label = (target.querySelector('[name="label"]') as HTMLInputElement)?.value;
    const type = (target.querySelector('[name="type"]') as HTMLSelectElement)?.value;
    const order = Number((target.querySelector('[name="order"]') as HTMLInputElement)?.value);
    const options = (target.querySelector('[name="options"]') as HTMLInputElement | HTMLTextAreaElement)?.value ?? "";
    const optionsNorm = options
      .split(/[,\n]/)
      .map((o) => o.trim())
      .filter(Boolean)
      .join(",");
    const res = await fetch(`/api/admin/parameters/${param.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, type, order, options: optionsNorm }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed");
      return;
    }
    setModal(null);
    load();
  }

  async function handleDelete(param: Param) {
    if (!confirm(`Delete parameter "${param.label}"?`)) return;
    const res = await fetch(`/api/admin/parameters/${param.id}`, { method: "DELETE" });
    if (res.ok) {
      setModal(null);
      load();
    }
  }

  if (loading) return <p className="text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setModal("new")}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Add parameter
      </button>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Key</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Label</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Type</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {params.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-sm text-zinc-900">{p.key}</td>
                <td className="px-4 py-3 text-zinc-600">{p.label}</td>
                <td className="px-4 py-3 text-zinc-600">{p.type}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => setModal(p)} className="text-blue-600 hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(p)} className="ml-3 text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal === "new" && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 font-semibold">New parameter</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Key (e.g. dueDate)"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                required
                className="w-full rounded border px-3 py-2"
              />
              <input
                type="text"
                placeholder="Label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                required
                className="w-full rounded border px-3 py-2"
              />
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded border px-3 py-2"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Select</option>
              </select>
              {form.type === "select" && (
                <div>
                  <label className="mb-1 block text-sm text-zinc-600">Options (comma-separated)</label>
                  <textarea
                    placeholder="e.g. active, inactive"
                    value={form.options}
                    onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                    rows={2}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Create</button>
                <button type="button" onClick={() => setModal(null)} className="rounded border px-4 py-2">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modal && modal !== "new" && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 font-semibold">Edit parameter</h2>
            <form onSubmit={(e) => handleUpdate(e, modal)} className="space-y-3">
              <p className="text-sm text-zinc-500">Key: {modal.key}</p>
              <input type="text" name="label" defaultValue={modal.label} className="w-full rounded border px-3 py-2" />
              <select name="type" defaultValue={modal.type} className="w-full rounded border px-3 py-2">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Select</option>
              </select>
              {modal.type === "select" && (
                <div>
                  <label className="mb-1 block text-sm text-zinc-600">Options (comma-separated)</label>
                  <textarea
                    name="options"
                    defaultValue={modal.options ?? ""}
                    placeholder="e.g. active, inactive"
                    rows={2}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
              )}
              <input type="number" name="order" defaultValue={modal.order} className="w-full rounded border px-3 py-2" />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Save</button>
                <button type="button" onClick={() => setModal(null)} className="rounded border px-4 py-2">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
