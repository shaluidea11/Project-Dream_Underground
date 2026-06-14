"use client";

import { useSegments } from "@/lib/hooks/use-segments";
import Link from "next/link";
import { Loader2, Users, Plus, Layers } from "lucide-react";

export default function SegmentsPage() {
  const { data: segments, isLoading } = useSegments();

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Segments
          </h1>
          <p className="text-zinc-400 mt-1">
            Create and manage audience segments for targeted campaigns.
          </p>
        </div>
        <Link
          href="/segments/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
        >
          <Plus className="w-4 h-4" />
          New Segment
        </Link>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            Loading segments...
          </div>
        ) : !segments || segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Layers className="w-12 h-12 mb-3 opacity-20" />
            <p>No segments created yet.</p>
            <Link
              href="/segments/new"
              className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Create your first segment →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {segments.map((segment) => (
              <Link
                key={segment.id}
                href={`/segments/${segment.id}`}
                className="flex items-center justify-between px-6 py-5 hover:bg-zinc-800/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                    {segment.name}
                  </h3>
                  {segment.description && (
                    <p className="text-sm text-zinc-500 mt-0.5 truncate max-w-lg">
                      {segment.description}
                    </p>
                  )}
                  {segment.nlQuery && (
                    <p className="text-xs text-indigo-400/70 mt-1 italic">
                      AI: &quot;{segment.nlQuery}&quot;
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-8 shrink-0 ml-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span className="font-mono font-semibold">
                        {segment.customerCount.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      members
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">
                      {segment.lastComputedAt
                        ? new Date(segment.lastComputedAt).toLocaleDateString()
                        : "Pending"}
                    </p>
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      computed
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
