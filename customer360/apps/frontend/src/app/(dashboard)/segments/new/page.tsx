"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCreateSegment,
  useAIGenerateSegment,
  FilterAST,
  FilterCondition,
} from "@/lib/hooks/use-segments";
import {
  ArrowLeft,
  Sparkles,
  SlidersHorizontal,
  Loader2,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";

const FIELD_OPTIONS = [
  { value: "totalSpend", label: "Total Spend", type: "number" },
  { value: "orderCount", label: "Order Count", type: "number" },
  { value: "engagementScore", label: "Engagement Score", type: "number" },
  { value: "city", label: "City", type: "string" },
  { value: "state", label: "State", type: "string" },
  { value: "lastOrderAt", label: "Last Order At", type: "date" },
  { value: "preferredChannel", label: "Preferred Channel", type: "string" },
];

const OP_OPTIONS = [
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "gte", label: "greater or equal" },
  { value: "lte", label: "less or equal" },
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
];

type Mode = "manual" | "ai";

export default function NewSegmentPage() {
  const router = useRouter();
  const createSegment = useCreateSegment();
  const aiGenerate = useAIGenerateSegment();

  const [mode, setMode] = useState<Mode>("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Manual mode state
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { field: "totalSpend", op: "gt", value: 0 },
  ]);

  // AI mode state
  const [nlQuery, setNlQuery] = useState("");
  const [aiResult, setAiResult] = useState<{
    filterDefinition: FilterAST;
    previewCount: number;
  } | null>(null);

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: "totalSpend", op: "gt", value: 0 },
    ]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (
    idx: number,
    key: keyof FilterCondition,
    value: string | number
  ) => {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], [key]: value };
    setConditions(updated);
  };

  const handleAIGenerate = async () => {
    if (!nlQuery.trim()) return;
    try {
      const result = await aiGenerate.mutateAsync(nlQuery);
      setAiResult({
        filterDefinition: result.filterDefinition,
        previewCount: result.previewCount,
      });
    } catch {
      // Error handled by react-query
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const filterDefinition: FilterAST =
      mode === "ai" && aiResult
        ? aiResult.filterDefinition
        : { logic, conditions };

    try {
      await createSegment.mutateAsync({
        name,
        description: description || undefined,
        filterDefinition,
        nlQuery: mode === "ai" ? nlQuery : undefined,
      });
      router.push("/segments");
    } catch {
      // Error handled
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/segments"
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            New Segment
          </h1>
          <p className="text-zinc-400 mt-1">
            Define your audience using filters or AI.
          </p>
        </div>
      </div>

      {/* Name & Description */}
      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
            Segment Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. High-Value Customers"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-3">
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            mode === "manual"
              ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Manual Builder
        </button>
        <button
          onClick={() => setMode("ai")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            mode === "ai"
              ? "bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Mode
        </button>
      </div>

      {/* Manual Builder */}
      {mode === "manual" && (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-zinc-300">
              Match customers where
            </span>
            <select
              value={logic}
              onChange={(e) => setLogic(e.target.value as "AND" | "OR")}
              className="px-3 py-1 bg-zinc-950 border border-zinc-700 rounded-md text-sm text-indigo-400 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="AND">ALL</option>
              <option value="OR">ANY</option>
            </select>
            <span className="text-sm text-zinc-400">
              conditions are true:
            </span>
          </div>

          <div className="space-y-3">
            {conditions.map((cond, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800/50"
              >
                <select
                  value={cond.field}
                  onChange={(e) => updateCondition(idx, "field", e.target.value)}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                >
                  {FIELD_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  value={cond.op}
                  onChange={(e) => updateCondition(idx, "op", e.target.value)}
                  className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {OP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <input
                  type={
                    FIELD_OPTIONS.find((f) => f.value === cond.field)?.type ===
                    "number"
                      ? "number"
                      : "text"
                  }
                  value={cond.value}
                  onChange={(e) => {
                    const fieldType = FIELD_OPTIONS.find(
                      (f) => f.value === cond.field
                    )?.type;
                    const val =
                      fieldType === "number"
                        ? Number(e.target.value)
                        : e.target.value;
                    updateCondition(idx, "value", val);
                  }}
                  placeholder="Value"
                  className="w-40 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {conditions.length > 1 && (
                  <button
                    onClick={() => removeCondition(idx)}
                    className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addCondition}
            className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Condition
          </button>
        </div>
      )}

      {/* AI Mode */}
      {mode === "ai" && (
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300 mb-1.5 block">
              Describe your audience in natural language
            </label>
            <textarea
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              rows={3}
              placeholder='e.g. "Customers who spent more than $500 and are from Mumbai"'
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow resize-none"
            />
          </div>
          <button
            onClick={handleAIGenerate}
            disabled={aiGenerate.isPending || !nlQuery.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            {aiGenerate.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate Filter
          </button>

          {aiGenerate.isError && (
            <p className="text-sm text-red-400">
              Failed to generate filter. Please try rephrasing your query.
            </p>
          )}

          {aiResult && (
            <div className="mt-4 p-4 rounded-lg bg-zinc-950 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-emerald-400" />
                <span className="text-lg font-bold text-white font-mono">
                  {aiResult.previewCount}
                </span>
                <span className="text-sm text-zinc-400">
                  customers match this filter
                </span>
              </div>
              <div className="text-xs text-zinc-500 font-mono bg-zinc-900 p-3 rounded overflow-x-auto">
                {JSON.stringify(aiResult.filterDefinition, null, 2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={
            createSegment.isPending ||
            !name.trim() ||
            (mode === "ai" && !aiResult)
          }
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]"
        >
          {createSegment.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Users className="w-4 h-4" />
          )}
          Create Segment
        </button>
      </div>
    </div>
  );
}
