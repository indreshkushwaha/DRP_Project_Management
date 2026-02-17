"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewMessagePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"NORMAL" | "IMPORTANT">("NORMAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to post message");
        setLoading(false);
        return;
      }
      router.push("/inbox");
      router.refresh();
    } catch {
      setError("Request failed");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">New message</h1>
      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "NORMAL" | "IMPORTANT")}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-zinc-900"
          >
            <option value="NORMAL">Normal</option>
            <option value="IMPORTANT">Important</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Posting…" : "Post message"}
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
