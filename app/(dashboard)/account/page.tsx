"use client";

import { useState, useEffect } from "react";

export default function AccountPage() {
  const [profile, setProfile] = useState<{ email: string; name: string | null } | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/account")
      .then((r) => r.json())
      .then((data) => {
        if (data.email) {
          setProfile(data);
          setEmail(data.email);
          setName(data.name ?? "");
        }
      })
      .catch(() => setMessage({ type: "err", text: "Failed to load profile." }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const body: { email?: string; name?: string; oldPassword?: string; newPassword?: string } = {};
    if (email.trim()) body.email = email.trim();
    if (name !== (profile?.name ?? "")) body.name = name.trim() || "";
    if (newPassword) {
      body.oldPassword = oldPassword;
      body.newPassword = newPassword;
    }
    if (Object.keys(body).length === 0) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Update failed." });
        setLoading(false);
        return;
      }
      setProfile({ email: data.email, name: data.name });
      setOldPassword("");
      setNewPassword("");
      setMessage({ type: "ok", text: "Profile updated." });
    } catch {
      setMessage({ type: "err", text: "Request failed." });
    }
    setLoading(false);
  }

  if (!profile) return <div className="text-zinc-500">Loading…</div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Account</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Update your email, name, or password. To change your password, enter your current password and the new one.
      </p>
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="oldPassword" className="mb-1 block text-sm font-medium text-zinc-700">
            Current password (only to change password)
          </label>
          <input
            id="oldPassword"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-zinc-700">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </div>
        {message && (
          <p
            className={`text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}
            role="alert"
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
