"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { AdminFeedbackRow } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { ExportIcon } from "@/components/ExportIcon";
import { AdminPageGate } from "@/components/AdminPageGate";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminFeedback } from "@/store/slices/dataSlice";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function FeedbackPage() {
  const toast = useToast();
  const dispatch = useAppDispatch();
  const feedback = useAppSelector((s) => s.data.adminFeedback);
  const loading = useAppSelector((s) => s.data.adminFeedbackLoading);
  const error = useAppSelector((s) => s.data.adminFeedbackError);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(100);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchAdminFeedback());
  }, [dispatch]);

  const filtered = useMemo(() => {
    if (!search.trim()) return feedback;
    const q = search.trim().toLowerCase();
    return feedback.filter(
      (r) =>
        (r.email || "").toLowerCase().includes(q) ||
        (r.fullName || "").toLowerCase().includes(q) ||
        (r.userId || "").toLowerCase().includes(q) ||
        (r.wouldHire || "").toLowerCase().includes(q) ||
        (r.comment || "").toLowerCase().includes(q)
    );
  }, [feedback, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const start = (currentPage - 1) * perPage;
  const pageRows = filtered.slice(start, start + perPage);

  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 md:px-6 md:py-12">
          <div className="mx-auto ">
            <h1 className="font-serif text-5xl font-bold text-foreground">Feedback</h1>
            <p className="mt-4 text-foreground opacity-80">Loading…</p>
          </div>
        </div>
      }
    >
      <AdminPageGate pageTitle="Feedback">
      {loading ? (
        <div className="px-4 py-8 md:px-6 md:py-12">
          <div className="mx-auto ">
            <h1 className="font-serif text-5xl font-bold text-foreground">Feedback</h1>
            <p className="mt-4 text-foreground opacity-80">Loading…</p>
          </div>
        </div>
      ) : error ? (
        <div className="px-4 py-8 md:px-6 md:py-12">
          <div className="mx-auto ">
            <h1 className="font-serif text-5xl font-bold text-foreground">Feedback</h1>
            <p className="mt-4 text-foreground opacity-80">{error}</p>
          </div>
        </div>
      ) : (
    <div className="px-4 py-8 md:px-6 md:py-12">
      <div className="mx-auto ">
        <div className="mb-2 flex items-center gap-2 text-sm text-foreground opacity-70">
          <Link href="/" className="hover:underline">Home</Link>
          <span>/</span>
          <Link href="/users" className="hover:underline">User management</Link>
          <span>/</span>
          <span>Feedback</span>
        </div>
        <h1 className="font-serif text-5xl font-bold text-foreground">
          Feedback
        </h1>
        <p className="mt-2 text-foreground opacity-80">
          Responses to &quot;Would you hire the bike?&quot; (Yes/No).
        </p>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search email, name, comment..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-xs rounded-lg border border-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:opacity-50"
              aria-label="Search feedback"
            />
            <a
              href="/api/admin/export-feedback"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-muted-bg p-2.5 text-foreground hover:bg-input-bg"
              title="Download feedback (Excel)"
              aria-label="Download feedback"
            >
              <ExportIcon />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground opacity-70">Rows per page</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-border bg-input-bg px-2 py-1.5 text-sm text-foreground"
              aria-label="Rows per page"
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-sm text-foreground opacity-70">
              {filtered.length === 0 ? "0" : `${start + 1}–${Math.min(start + perPage, filtered.length)}`} of {filtered.length}
            </span>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-sm text-foreground disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-border bg-muted-bg px-3 py-1.5 text-sm text-foreground disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[700px] text-left text-sm" role="grid">
            <thead>
              <tr className="border-b border-border bg-muted-bg">
                <th className="px-4 py-3 font-semibold text-foreground">Timestamp</th>
                <th className="px-4 py-3 font-semibold text-foreground">User ID</th>
                <th className="px-4 py-3 font-semibold text-foreground">Email</th>
                <th className="px-4 py-3 font-semibold text-foreground">Full name</th>
                <th className="px-4 py-3 font-semibold text-foreground">Would Hire</th>
                <th className="px-4 py-3 font-semibold text-foreground">Comment</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr
                  key={`${r.timestamp}-${r.userId}-${i}`}
                  className="border-b border-border text-foreground last:border-0"
                >
                  <td className="px-4 py-3">{r.timestamp || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.userId || "—"}</td>
                  <td className="px-4 py-3">{r.email || "—"}</td>
                  <td className="px-4 py-3">{r.fullName || "—"}</td>
                  <td className="px-4 py-3">{r.wouldHire || "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3" title={r.comment || undefined}>{r.comment || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pageRows.length === 0 && (
          <p className="mt-4 text-center text-sm text-foreground opacity-70">
            No feedback to show.
          </p>
        )}
      </div>
    </div>
      )}
    </AdminPageGate>
    </Suspense>
  );
}
