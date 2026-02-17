"use client";

import { useState, useEffect, useRef } from "react";
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
    <label className={label ? "flex items-center gap-2" : "block"}>
      {label ? <span className="text-sm font-medium text-zinc-600">{label}</span> : null}
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={apply}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        placeholder="—"
        className={`rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 ${label ? "w-36" : "w-full"}`}
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
  const otherFilterColumns = filterableColumns.filter((col) => col.key !== "status");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFilterPanelOpen(false);
      }
    }
    if (filterPanelOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [filterPanelOpen]);

  function statusBadge(s: string) {
    const t = String(s ?? "").toLowerCase();
    if (t === "completed") return "bg-emerald-100 text-emerald-800";
    if (t === "in_progress") return "bg-blue-100 text-blue-800";
    return "bg-amber-100 text-amber-800";
  }

  return (
    <div className="min-w-0 max-w-full">
      {/* Toolbar: Filters (left) + Columns (right) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Filters</span>
          <select
            value={currentFilters.status ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const next = { ...currentFilters };
              if (v === "") delete next.status;
              else next.status = v;
              router.push(buildProjectsUrl({ page: 1, limit: pagination.limit, filters: next }));
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {otherFilterColumns.length > 0 && (
            <div className="relative" ref={filterPanelRef}>
              <button
                type="button"
                onClick={() => setFilterPanelOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  hasActiveFilters && Object.keys(currentFilters).some((k) => k !== "status")
                    ? "border-zinc-300 bg-zinc-50 text-zinc-800"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                More filters
                <span className="text-zinc-400">▾</span>
              </button>
              {filterPanelOpen && (
                <div className="absolute left-0 top-full z-10 mt-1.5 w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Filter by column</p>
                  <div className="space-y-3">
                    {otherFilterColumns.map((col) => (
                      <div key={col.key}>
                        <span className="mb-1 block text-xs font-medium text-zinc-600">{col.label}</span>
                        <FilterTextInput
                          label=""
                          value={currentFilters[col.key] ?? ""}
                          onApply={(value) => {
                            const next = { ...currentFilters };
                            if (value.trim() === "") delete next[col.key];
                            else next[col.key] = value.trim();
                            router.push(buildProjectsUrl({ page: 1, limit: pagination.limit, filters: next }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {hasActiveFilters && (
            <Link
              href={buildProjectsUrl({ page: 1, limit: pagination.limit })}
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
            >
              Clear all
            </Link>
          )}
        </div>
        {viewableParams.length > 0 && (
          <button
            type="button"
            onClick={openModal}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
          >
            Columns
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {Object.entries(currentFilters).map(([key, value]) => {
            const col = filterableColumns.find((c) => c.key === key);
            const label = col?.label ?? key;
            const next = { ...currentFilters };
            delete next[key];
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700"
              >
                {label}: {value}
                <Link
                  href={buildProjectsUrl({ page: 1, limit: pagination.limit, filters: Object.keys(next).length ? next : undefined })}
                  className="rounded-full p-0.5 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
                  aria-label={`Remove filter ${label}`}
                >
                  ×
                </Link>
              </span>
            );
          })}
        </div>
      )}

      {/* Table with horizontal scroll when many columns */}
      <div className="min-w-0 overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm">
        <table className="w-full divide-y divide-zinc-100" style={{ minWidth: "max-content" }}>
          <thead>
            <tr className="bg-zinc-50/90">
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Status</th>
              {columnsToShow.map((p) => (
                <th key={p.id} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  {p.label}
                </th>
              ))}
              <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {projects.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-zinc-50/80">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-medium text-zinc-900 transition-colors hover:text-zinc-600"
                  >
                    {String(p.name ?? "")}
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(String(p.status ?? ""))}`}>
                    {String(p.status ?? "").replace("_", " ")}
                  </span>
                </td>
                {columnsToShow.map((col) => (
                  <td key={col.id} className="px-5 py-3.5 text-sm text-zinc-600">
                    {String(p[col.key] ?? "—")}
                  </td>
                ))}
                <td className="px-5 py-3.5 text-right text-sm text-zinc-500">
                  {new Date(String(p.updatedAt ?? "")).toLocaleDateString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <div className="px-5 py-16 text-center">
            <p className="text-zinc-500">No projects yet.</p>
            <p className="mt-1 text-sm text-zinc-400">Create one to get started.</p>
          </div>
        )}
      </div>
      {pagination.totalPages > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-zinc-600">
            Showing <span className="font-medium text-zinc-900">{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium text-zinc-900">{pagination.total}</span>
          </p>
          <nav className="flex items-center gap-2" aria-label="Pagination">
            {pagination.page > 1 ? (
              <Link
                href={buildProjectsUrl({
                  page: pagination.page - 1,
                  limit: pagination.limit,
                  filters: filtersForPagination,
                })}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:border-zinc-300"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">Previous</span>
            )}
            <span className="min-w-[7rem] px-3 py-2 text-center text-sm text-zinc-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            {pagination.page < pagination.totalPages ? (
              <Link
                href={buildProjectsUrl({
                  page: pagination.page + 1,
                  limit: pagination.limit,
                  filters: filtersForPagination,
                })}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:border-zinc-300"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-400">Next</span>
            )}
          </nav>
        </div>
      )}
      {modalOpen && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h2 className="text-lg font-semibold text-zinc-900">Choose columns</h2>
                <p className="mt-1 text-sm text-zinc-500">Select which parameters to show in the table.</p>
                <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
                  {viewableParams.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(p.key)}
                        onChange={() => toggleKey(p.key)}
                        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                      />
                      <span className="text-sm font-medium text-zinc-800">{p.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100"
                  >
                    Clear
                  </button>
                </div>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
      )}
    </div>
  );
}
