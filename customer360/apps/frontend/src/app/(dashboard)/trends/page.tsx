"use client";

import { useState } from "react";
import { useTrends, useMarkTrendRead, useTriggerTrends } from "@/lib/hooks/use-trends";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, RefreshCw, Send, CheckCircle, Mail, MessageSquare, PhoneCall, Zap } from "lucide-react";

export default function TrendsPage() {
  const router = useRouter();
  const { data: insights, isLoading, refetch } = useTrends();
  const markRead = useMarkTrendRead();
  const triggerScan = useTriggerTrends();
  const [triggerSuccess, setTriggerSuccess] = useState(false);

  const handleTrigger = async () => {
    setTriggerSuccess(false);
    try {
      await triggerScan.mutateAsync();
      setTriggerSuccess(true);
      setTimeout(() => setTriggerSuccess(false), 3000);
    } catch (err) {
      // Handled by react query / console
    }
  };

  const handleCreateCampaign = async (trend: any) => {
    // Mark as read
    if (!trend.isRead) {
      await markRead.mutateAsync(trend.id);
    }

    // Redirect to campaign builder with query parameters
    const params = new URLSearchParams({
      insightId: trend.id,
      name: `Promo - ${trend.title}`,
      channel: trend.suggestedChannel || "whatsapp",
      message: trend.suggestedMessage || "",
    });
    
    // Add suggested segment name if available
    if (trend.suggestedSegment) {
      params.set("segmentName", trend.suggestedSegment.name);
      params.set("segmentDesc", trend.suggestedSegment.description);
      params.set("segmentAst", JSON.stringify(trend.suggestedSegment.filter_ast));
    }

    router.push(`/campaigns/new?${params.toString()}`);
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="w-4 h-4 text-sky-400" />;
      case "whatsapp":
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case "sms":
        return <PhoneCall className="w-4 h-4 text-amber-400" />;
      case "rcs":
        return <Zap className="w-4 h-4 text-pink-400" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-2" />
        Analyzing data for insights...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-2 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
            Trend Intelligence
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            AI-driven shopper recommendations, market opportunities, and audit logs.
          </p>
        </div>
        
        <button
          type="button"
          onClick={handleTrigger}
          disabled={triggerScan.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(79,70,229,0.35)] transition-all hover:scale-[1.02] shrink-0 self-start sm:self-auto"
        >
          {triggerScan.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {triggerScan.isPending ? "Scanning database..." : "Trigger AI Trend Scan"}
        </button>
      </div>

      {triggerSuccess && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>New AI scan complete. Fresh trend insights loaded.</span>
        </div>
      )}

      {!insights || insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 border border-zinc-850 rounded-2xl p-8 text-center">
          <Sparkles className="w-12 h-12 text-zinc-600 mb-3" />
          <h3 className="text-lg font-bold text-zinc-300">No Insights Yet</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md">
            Execute a database scan to analyze purchase records and discover marketing opportunities.
          </p>
          <button
            onClick={handleTrigger}
            disabled={triggerScan.isPending}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold border border-zinc-700 transition-colors"
          >
            Run Initial Scan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {insights.map((trend) => (
            <div
              key={trend.id}
              className={`relative bg-zinc-900/35 border rounded-2xl p-6 shadow-xl transition-all hover:border-zinc-700 flex flex-col gap-4 ${
                trend.isRead ? "border-zinc-850 opacity-80" : "border-indigo-900/40 shadow-indigo-950/5"
              }`}
            >
              {/* Unread indicator */}
              {!trend.isRead && (
                <span className="absolute top-6 right-6 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-zinc-950 animate-pulse" />
              )}

              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-500 font-mono">
                  {new Date(trend.createdAt).toLocaleString()}
                </span>
                <h3 className="text-xl font-bold text-white pr-6">
                  {trend.title}
                </h3>
                <p className="text-zinc-300 text-sm leading-relaxed mt-1">
                  {trend.insight}
                </p>
              </div>

              {trend.suggestedSegment && (
                <div className="bg-zinc-950/50 p-4 border border-zinc-850 rounded-xl flex flex-col gap-2.5">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Suggested Audience</span>
                      <p className="text-sm font-semibold text-zinc-200">{trend.suggestedSegment.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{trend.suggestedSegment.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg">
                      {getChannelIcon(trend.suggestedChannel)}
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                        {trend.suggestedChannel}
                      </span>
                    </div>
                  </div>

                  {trend.suggestedMessage && (
                    <div className="pt-2 border-t border-zinc-850">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-1">Suggested Message Copy</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-zinc-950/80 px-3.5 py-2.5 border border-zinc-900 rounded-lg whitespace-pre-wrap">
                        {trend.suggestedMessage}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2 mt-2 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => !trend.isRead && markRead.mutate(trend.id)}
                  disabled={trend.isRead || markRead.isPending}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-all ${
                    trend.isRead
                      ? "border-zinc-800 text-zinc-500 cursor-default"
                      : "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {trend.isRead ? "Insight Read" : "Mark as Read"}
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateCampaign(trend)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all hover:scale-[1.02]"
                >
                  <Send className="w-3.5 h-3.5" />
                  Create Campaign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
