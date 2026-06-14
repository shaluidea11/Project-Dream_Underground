"use client";

import { use, useState } from "react";
import {
  useSegment,
  useSegmentMembers,
  useRecomputeSegment,
} from "@/lib/hooks/use-segments";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Users,
  RefreshCw,
  CalendarDays,
} from "lucide-react";

export default function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [page, setPage] = useState(1);

  const { data: segment, isLoading: segLoading } = useSegment(id);
  const { data: membersData, isLoading: membersLoading } = useSegmentMembers(
    id,
    page
  );
  const recompute = useRecomputeSegment();

  if (segLoading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-zinc-400">
        <p>Segment not found.</p>
        <Link
          href="/segments"
          className="text-indigo-400 hover:text-indigo-300 mt-4"
        >
          ← Back to Segments
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/segments"
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {segment.name}
          </h1>
          {segment.description && (
            <p className="text-zinc-400 mt-1">{segment.description}</p>
          )}
          {segment.nlQuery && (
            <p className="text-xs text-indigo-400/70 mt-1 italic">
              AI query: &quot;{segment.nlQuery}&quot;
            </p>
          )}
        </div>
        <button
          onClick={() => recompute.mutate(id)}
          disabled={recompute.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium transition-colors border border-zinc-700"
        >
          {recompute.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Recompute
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-bl-full -mr-4 -mt-4 blur-2xl" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 font-medium text-sm">Members</span>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white font-mono">
            {segment.customerCount.toLocaleString()}
          </p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 blur-2xl" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 font-medium text-sm">
              Last Computed
            </span>
            <CalendarDays className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-lg font-medium text-white">
            {segment.lastComputedAt
              ? new Date(segment.lastComputedAt).toLocaleString()
              : "Pending..."}
          </p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 blur-2xl" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 font-medium text-sm">
              Filter
            </span>
          </div>
          <pre className="text-xs text-zinc-400 font-mono overflow-x-auto max-h-20">
            {JSON.stringify(segment.filterDefinition, null, 2)}
          </pre>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" /> Segment Members
        </h2>

        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-950/50 uppercase border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Total Spend</th>
                <th className="px-6 py-4 font-medium">Engagement</th>
                <th className="px-6 py-4 font-medium">City</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {membersLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-zinc-500"
                  >
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading members...
                  </td>
                </tr>
              ) : !membersData || membersData.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-zinc-500"
                  >
                    No customers match this filter.
                  </td>
                </tr>
              ) : (
                membersData.items.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-zinc-100 hover:text-indigo-400 transition-colors"
                      >
                        {customer.canonicalName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {customer.email || "—"}
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-mono">
                      $
                      {customer.totalSpend.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              customer.engagementScore >= 70
                                ? "bg-emerald-500"
                                : customer.engagementScore >= 30
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${Math.max(customer.engagementScore, 2)}%`,
                            }}
                          />
                        </div>
                        <span className="text-zinc-400 font-mono text-xs">
                          {Math.round(customer.engagementScore)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {customer.city || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {membersData && membersData.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <span className="text-sm text-zinc-500">
              Showing{" "}
              <span className="font-medium text-zinc-300">
                {(page - 1) * membersData.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-zinc-300">
                {Math.min(page * membersData.limit, membersData.total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-zinc-300">
                {membersData.total}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm bg-zinc-800 text-zinc-300 rounded-md disabled:opacity-50 hover:bg-zinc-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(membersData.totalPages, p + 1))
                }
                disabled={page === membersData.totalPages}
                className="px-3 py-1 text-sm bg-zinc-800 text-zinc-300 rounded-md disabled:opacity-50 hover:bg-zinc-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
