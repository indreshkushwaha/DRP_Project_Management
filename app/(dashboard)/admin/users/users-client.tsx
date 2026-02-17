"use client";

import { useState, useEffect } from "react";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "STAFF" as const });
  const [error, setError] = useState("");

  function load() {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setModal(null);
    setForm({ email: "", password: "", name: "", role: "STAFF" });
    load();
  }

  async function handleUpdate(e: React.FormEvent, user: User) {
    e.preventDefault();
    setError("");
    const body: Record<string, string> = {};
    const target = e.target as HTMLFormElement;
    const name = (target.querySelector('[name="name"]') as HTMLInputElement)?.value;
    const email = (target.querySelector('[name="email"]') as HTMLInputElement)?.value;
    const role = (target.querySelector('[name="role"]') as HTMLSelectElement)?.value;
    const password = (target.querySelector('[name="password"]') as HTMLInputElement)?.value;
    if (name !== undefined) body.name = name;
    if (email !== undefined) body.email = email;
    if (role) body.role = role;
    if (password && password.length >= 6) body.password = password;
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setModal(null);
    load();
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete ${user.email}?`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
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
        onClick={() => setModal("create")}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Add user
      </button>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Role</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-zinc-900">{u.email}</td>
                <td className="px-4 py-3 text-zinc-600">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-600">{u.role}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setModal(u)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(u)}
                    className="ml-3 text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal === "create" && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 font-semibold">Create user</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                className="w-full rounded border px-3 py-2"
              />
              <input
                type="password"
                name="password"
                placeholder="Password (min 6)"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
                className="w-full rounded border px-3 py-2"
              />
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded border px-3 py-2"
              />
              <select
                name="role"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as "ADMIN" | "MANAGER" | "STAFF" }))
                }
                className="w-full rounded border px-3 py-2"
              >
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </select>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded border px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modal && modal !== "create" && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 font-semibold">Edit user</h2>
            <form onSubmit={(e) => handleUpdate(e, modal)} className="space-y-3">
              <input
                type="email"
                name="email"
                defaultValue={modal.email}
                className="w-full rounded border px-3 py-2"
              />
              <input
                type="password"
                name="password"
                placeholder="New password (leave blank to keep)"
                className="w-full rounded border px-3 py-2"
              />
              <input
                type="text"
                name="name"
                defaultValue={modal.name ?? ""}
                className="w-full rounded border px-3 py-2"
              />
              <select name="role" defaultValue={modal.role} className="w-full rounded border px-3 py-2">
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="STAFF">Staff</option>
              </select>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded border px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
