"use client";

import { useState } from "react";
import { useCustomers } from "@/lib/hooks/use-customers";
import Link from "next/link";
import { Search, Loader2, UserRound, ArrowUpDown } from "lucide-react";

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const { data, isLoading } = useCustomers({
    page,
    limit: 20,
    search,
    sortBy,
    sortOrder,
  });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(field);
      setSortOrder("DESC");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Customers</h1>
          <p className="text-zinc-400 mt-1">Manage and view your unified customer profiles.</p>
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-4 shadow-xl">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-950/50 uppercase border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort("engagementScore")}
                >
                  <div className="flex items-center gap-1">
                    Engagement
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th
                  className="px-6 py-4 font-medium cursor-pointer hover:text-white transition-colors group"
                  onClick={() => handleSort("totalSpend")}
                >
                  <div className="flex items-center gap-1">
                    Total Spend
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="px-6 py-4 font-medium">Tags</th>
                <th className="px-6 py-4 font-medium">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading customers...
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <UserRound className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                data?.items.map((customer) => (
                  <tr
                    key={customer.id}
                    className="bg-transparent hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="flex flex-col group-hover:translate-x-1 transition-transform"
                      >
                        <span className="font-medium text-zinc-100">
                          {customer.canonicalName}
                        </span>
                        <span className="text-xs text-zinc-500 mt-0.5">
                          {customer.email || customer.phone || "No contact info"}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              customer.engagementScore >= 70
                                ? "bg-emerald-500"
                                : customer.engagementScore >= 30
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.max(customer.engagementScore, 2)}%` }}
                          />
                        </div>
                        <span className="text-zinc-300 font-mono text-xs">
                          {Math.round(customer.engagementScore)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-medium">
                      ${customer.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {customer.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          >
                            {tag}
                          </span>
                        ))}
                        {(!customer.tags || customer.tags.length === 0) && (
                          <span className="text-zinc-600 text-xs italic">Unprofiled</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs">
                      {customer.lastOrderAt
                        ? new Date(customer.lastOrderAt).toLocaleDateString()
                        : "Never"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <span className="text-sm text-zinc-500">
              Showing <span className="font-medium text-zinc-300">{(page - 1) * data.limit + 1}</span> to{" "}
              <span className="font-medium text-zinc-300">
                {Math.min(page * data.limit, data.total)}
              </span>{" "}
              of <span className="font-medium text-zinc-300">{data.total}</span> customers
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
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
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
