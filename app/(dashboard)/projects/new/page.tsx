"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const router = useRouter();
  const [params, setParams] = useState<Array<{ id: string; key: string; label: string; type: string }>>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("pending");
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(() => {});
    fetch("/api/parameters")
      .then((r) => {
        if (r.ok) return r.json();
        return [];
      })
      .then((list) => setParams(Array.isArray(list) ? list : []))
      .catch(() => setParams([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const body: Record<string, unknown> = { name, status };
    for (const [k, v] of Object.entries(custom)) {
      if (v !== undefined && v !== "") body[k] = v;
    }
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        setLoading(false);
        return;
      }
      router.push(`/projects/${data.id}`);
      router.refresh();
    } catch {
      setError("Request failed");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">New project</h1>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        {params.map((p) => (
          <div key={p.id}>
            <label className="mb-1 block text-sm font-medium text-zinc-700">{p.label}</label>
            <input
              type={p.type === "number" ? "number" : "text"}
              value={custom[p.key] ?? ""}
              onChange={(e) => setCustom((c) => ({ ...c, [p.key]: e.target.value }))}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
        ))}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create project"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border border-zinc-300 px-4 py-2 font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
