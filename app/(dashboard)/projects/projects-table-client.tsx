"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ViewableParam } from "@/lib/project-service";

type ProjectRow = Record<string, unknown> & {
  id: string;
  name?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type FilterableColumn = { key: string; label: string };

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

function buildProjectsUrl({
  page,
  limit,
  filters,
}: { page?: number; limit?: number; filters?: Record<string, string> }): string {
  const params = new URLSearchParams();
  if (page != null && page > 1) params.set("page", String(page));
  if (limit != null && limit !== 10) params.set("limit", String(limit));
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v.trim() !== "") params.set(k, v.trim());
    }
  }
  const q = params.toString();
  return q ? `/projects?${q}` : "/projects";
}

function FilterTextInput({
  label,
  value,
  onApply,
}: { label: string; value: string; onApply: (value: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const apply = () => {
    if (local.trim() !== value.trim()) onApply(local);
  };
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-zinc-600">{label}</span>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        placeholder="—"
        className="w-32 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400"
      />
    </label>
  );
}

export function ProjectsTableClient({
  projects,
  viewableParams,
  columnsToShow,
  pagination,
  currentFilters,
  filterableColumns,
}: {
  projects: ProjectRow[];
  viewableParams: ViewableParam[];
  columnsToShow: ViewableParam[];
  pagination: Pagination;
  currentFilters: Record<string, string>;
  filterableColumns: FilterableColumn[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    const set = new Set(columnsToShow.map((p) => p.key));
    if (set.size === 0) viewableParams.forEach((p) => set.add(p.key));
    return set;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    if (columnsToShow.length > 0) {
      setSelectedKeys(new Set(columnsToShow.map((p) => p.key)));
    } else {
      setSelectedKeys(new Set(viewableParams.map((p) => p.key)));
    }
    setError("");
    setModalOpen(true);
  }

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelectedKeys(new Set(viewableParams.map((p) => p.key)));
  }

  function clearAll() {
    setSelectedKeys(new Set());
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const keys = Array.from(selectedKeys);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboardColumnKeys: keys }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        setSaving(false);
        return;
      }
      setModalOpen(false);
      router.refresh();
    } catch {
      setError("Request failed");
    }
    setSaving(false);
  }

  const hasActiveFilters = Object.keys(currentFilters).length > 0;
  const filtersForPagination = hasActiveFilters ? currentFilters : undefined;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-3">
        <span className="text-sm font-medium text-zinc-700">Filters:</span>
        <label className="flex items-center gap-2">
          <span className="text-sm text-zinc-600">Status</span>
          <select
            value={currentFilters.status ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const next = { ...currentFilters };
              if (v === "") delete next.status;
              else next.status = v;
              router.push(buildProjectsUrl({ page: 1, limit: pagination.limit, filters: next }));
            }}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {filterableColumns
          .filter((col) => col.key !== "status")
          .map((col) => (
            <FilterTextInput
              key={col.key}
              label={col.label}
              value={currentFilters[col.key] ?? ""}
              onApply={(value) => {
                const next = { ...currentFilters };
                if (value.trim() === "") delete next[col.key];
                else next[col.key] = value.trim();
                router.push(buildProjectsUrl({ page: 1, limit: pagination.limit, filters: next }));
              }}
            />
          ))}
        {hasActiveFilters && (
          <Link
            href={buildProjectsUrl({ page: 1, limit: pagination.limit })}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear all filters
          </Link>
        )}
      </div>
      {hasActiveFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-500">Active:</span>
          {Object.entries(currentFilters).map(([key, value]) => {
            const col = filterableColumns.find((c) => c.key === key);
            const label = col?.label ?? key;
            const next = { ...currentFilters };
            delete next[key];
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 rounded bg-zinc-200 px-2 py-0.5 text-sm text-zinc-800"
              >
                {label}: {value}
                <Link
                  href={buildProjectsUrl({ page: 1, limit: pagination.limit, filters: Object.keys(next).length ? next : undefined })}
                  className="ml-0.5 font-medium text-zinc-600 hover:text-zinc-900"
                  aria-label={`Remove filter ${label}`}
                >
                  ×
                </Link>
              </span>
            );
          })}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Status</th>
              {columnsToShow.map((p) => (
                <th key={p.id} className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  {p.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="font-medium text-blue-600 hover:underline">
                    {String(p.name ?? "")}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{String(p.status ?? "")}</td>
                {columnsToShow.map((col) => (
                  <td key={col.id} className="px-4 py-3 text-zinc-600">
                    {String(p[col.key] ?? "")}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-sm text-zinc-500">
                  {new Date(String(p.updatedAt ?? "")).toLocaleDateString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <p className="px-4 py-8 text-center text-zinc-500">No projects yet.</p>
        )}
      </div>
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3">
          <p className="text-sm text-zinc-600">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <nav className="flex items-center gap-1" aria-label="Pagination">
            {pagination.page > 1 ? (
              <Link
                href={buildProjectsUrl({
                  page: pagination.page - 1,
                  limit: pagination.limit,
                  filters: filtersForPagination,
                })}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400">Previous</span>
            )}
            <span className="px-2 text-sm text-zinc-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            {pagination.page < pagination.totalPages ? (
              <Link
                href={buildProjectsUrl({
                  page: pagination.page + 1,
                  limit: pagination.limit,
                  filters: filtersForPagination,
                })}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Next
              </Link>
            ) : (
              <span className="rounded border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400">Next</span>
            )}
          </nav>
        </div>
      )}
      {viewableParams.length > 0 && (
        <>
          <button
            type="button"
            onClick={openModal}
            className="mt-3 rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Choose columns
          </button>
          {modalOpen && (
            <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
                <h2 className="mb-4 font-semibold text-zinc-900">Choose columns</h2>
                <p className="mb-3 text-sm text-zinc-500">Select which parameters to show in the table.</p>
                <div className="mb-4 max-h-60 space-y-2 overflow-y-auto">
                  {viewableParams.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(p.key)}
                        onChange={() => toggleKey(p.key)}
                        className="rounded border-zinc-300"
                      />
                      <span className="text-sm text-zinc-800">{p.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                  >
                    Clear
                  </button>
                </div>
                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
