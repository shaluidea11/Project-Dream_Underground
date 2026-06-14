"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCampaign, useLaunchCampaign } from "@/lib/hooks/use-campaigns";
import { useTriggerCampaignAnalysis } from "@/lib/hooks/use-trends";
import { Loader2, ArrowLeft, Send, CheckCircle2, AlertTriangle, Calendar, Layers, Activity, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Poll status while campaign is "running" or "draft" to check launch progress
  const { data: campaign, isLoading, refetch } = useCampaign(id, {
    refetchInterval: (data) => (data?.status === "running" ? 2000 : false),
  });

  const launchCampaign = useLaunchCampaign();
  const [showConfirm, setShowConfirm] = useState(false);
  const [launchError, setLaunchError] = useState("");

  const triggerAnalysis = useTriggerCampaignAnalysis();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const handleGenerateReport = async () => {
    setAnalyzing(true);
    setAnalysisError("");
    try {
      await triggerAnalysis.mutateAsync(id);
      refetch();
    } catch (err: any) {
      setAnalysisError(err.message || "Failed to generate AI report.");
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (campaign && campaign.status === "completed" && campaign.analytics && !campaign.analytics.aiSummary && !analyzing && !analysisError) {
      handleGenerateReport();
    }
  }, [campaign]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        Loading campaign details...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
        <p>Campaign not found.</p>
        <Link href="/campaigns" className="mt-4 text-indigo-400 hover:underline">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const handleLaunch = async () => {
    setLaunchError("");
    try {
      await launchCampaign.mutateAsync(campaign.id);
      setShowConfirm(false);
      refetch();
    } catch (err: any) {
      setLaunchError(err.message || "Failed to launch campaign.");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-zinc-800 text-zinc-300 border border-zinc-700";
      case "scheduled":
        return "bg-blue-500/15 text-blue-400 border border-blue-500/25";
      case "running":
        return "bg-amber-500/15 text-amber-400 border border-amber-500/25";
      case "completed":
        return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25";
      case "paused":
        return "bg-red-500/15 text-red-400 border border-red-500/25";
      default:
        return "bg-zinc-800 text-zinc-400";
    }
  };

  const totalMembers = campaign.segment?.customerCount || 0;
  const analytics = campaign.analytics;
  const totalSent = analytics?.totalSent || 0;
  const progressPercent = totalMembers > 0 ? Math.round((totalSent / totalMembers) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-100">
      {/* Top Navigation */}
      <div className="flex items-center gap-4">
        <Link
          href="/campaigns"
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight text-white truncate">
              {campaign.name}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getStatusStyle(campaign.status)}`}>
              {campaign.status}
            </span>
          </div>
          <p className="text-zinc-400 mt-1 flex items-center gap-1.5 text-sm">
            <Layers className="w-4 h-4 text-indigo-400" />
            Targeting Segment:{" "}
            <Link href={`/segments/${campaign.segmentId}`} className="text-indigo-400 hover:underline">
              {campaign.segment?.name || "Lapsed Segment"}
            </Link>{" "}
            ({totalMembers.toLocaleString()} members)
          </p>
        </div>
      </div>

      {launchError && (
        <div className="flex items-start gap-2.5 p-4 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{launchError}</span>
        </div>
      )}

      {/* Main Campaign Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Message Body */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Message Content Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white border-b border-zinc-800 pb-3">Campaign Message</h3>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Channel</span>
                  <p className="font-semibold text-zinc-200 uppercase mt-0.5">{campaign.channel}</p>
                </div>
                {campaign.scheduledAt && (
                  <div>
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Scheduled Launch</span>
                    <p className="font-semibold text-zinc-200 mt-0.5 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" /> {new Date(campaign.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {campaign.subject && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Subject Line</span>
                  <p className="text-sm font-medium text-white bg-zinc-950 px-4 py-2.5 border border-zinc-850 rounded-lg mt-1">
                    {campaign.subject}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Message Copy</span>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed bg-zinc-950 px-4 py-3 border border-zinc-850 rounded-lg mt-1 font-mono">
                  {campaign.messageBody}
                </p>
              </div>

              {(campaign.ctaText || campaign.ctaUrl) && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Call to Action (CTA)</span>
                  <div className="flex items-center justify-between mt-1 bg-zinc-950 px-4 py-3 border border-zinc-850 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500 font-semibold uppercase">{campaign.ctaText || "Button"}</p>
                      <p className="text-xs text-indigo-400 underline truncate max-w-xs">{campaign.ctaUrl || "#"}</p>
                    </div>
                    {campaign.ctaText && (
                      <span className="px-3.5 py-1.5 bg-indigo-600 rounded text-xs font-semibold text-white">
                        {campaign.ctaText}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Launch Action Section */}
            {campaign.status === "draft" && (
              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-[1.02]"
                >
                  <Send className="w-4 h-4" />
                  Launch Campaign
                </button>
              </div>
            )}
          </div>

          {/* AI Performance Analysis Section */}
          {campaign.status === "completed" && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" /> AI Performance Analysis
                </h3>
                
                <button
                  onClick={handleGenerateReport}
                  disabled={analyzing}
                  className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-300 font-semibold text-xs rounded-lg disabled:opacity-50 transition-all"
                >
                  {analyzing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {analyzing ? "Analyzing..." : "Regenerate Analysis"}
                </button>
              </div>

              {analysisError && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs">
                  {analysisError}
                </div>
              )}

              {campaign.analytics?.aiSummary ? (
                <div className="prose prose-invert max-w-none prose-sm">
                  {campaign.analytics.aiSummary.split("\n").map((line, idx) => {
                    if (line.startsWith("### ")) {
                      return (
                        <h4 key={idx} className="text-sm font-extrabold text-indigo-400 mt-4 mb-2">
                          {line.replace("### ", "")}
                        </h4>
                      );
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <li key={idx} className="text-xs text-zinc-300 ml-4 list-disc mb-1 leading-relaxed">
                          {line.replace("- ", "")}
                        </li>
                      );
                    }
                    if (line.trim() === "") {
                      return <div key={idx} className="h-2" />;
                    }
                    return (
                      <p key={idx} className="text-xs text-zinc-300 leading-relaxed mb-2">
                        {line}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-500 text-xs gap-2">
                  {analyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-650" />
                      <span>AI is inspecting campaign results and formulating performance suggestions...</span>
                    </>
                  ) : (
                    <>
                      <span>No AI performance report generated for this campaign yet.</span>
                      <button
                        onClick={handleGenerateReport}
                        className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                      >
                        Generate Report Now
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Execution Metrics & Live Status */}
        <div className="flex flex-col gap-6">
          {/* Progress / Status Tracker */}
          {(campaign.status === "running" || campaign.status === "completed") && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col gap-5">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                <Activity className="w-5 h-5 text-indigo-400" /> Dispatch Progress
              </h3>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Dispatch Status</span>
                  <span className="font-semibold text-zinc-100">{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-950 border border-zinc-850 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{totalSent.toLocaleString()} Sent</span>
                  <span>{totalMembers.toLocaleString()} Target</span>
                </div>
              </div>

              {/* Counters Grid */}
              <div className="grid grid-cols-2 gap-3 text-center mt-2">
                <div className="bg-zinc-950 p-3.5 border border-zinc-850 rounded-lg">
                  <span className="text-2xl font-extrabold font-mono text-zinc-100">
                    {totalSent.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">Dispatched</p>
                </div>
                <div className="bg-zinc-950 p-3.5 border border-zinc-850 rounded-lg">
                  <span className="text-2xl font-extrabold font-mono text-green-400">
                    {analytics?.totalDelivered.toLocaleString() || "0"}
                  </span>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">Delivered</p>
                </div>
                <div className="bg-zinc-950 p-3.5 border border-zinc-850 rounded-lg">
                  <span className="text-2xl font-extrabold font-mono text-red-400">
                    {analytics?.totalFailed.toLocaleString() || "0"}
                  </span>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">Failed</p>
                </div>
                <div className="bg-zinc-950 p-3.5 border border-zinc-850 rounded-lg">
                  <span className="text-2xl font-extrabold font-mono text-indigo-400">
                    {analytics?.totalOpened.toLocaleString() || "0"}
                  </span>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mt-1">Opened</p>
                </div>
              </div>
            </div>
          )}

          {/* Setup / Scheduled Notification Info */}
          {campaign.status === "scheduled" && (
            <div className="bg-blue-950/15 border border-blue-900/30 rounded-xl p-5 flex gap-3 text-sm text-blue-300">
              <Calendar className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Scheduled Broadcast</p>
                <p className="text-xs text-blue-400/80 mt-1 leading-relaxed">
                  This campaign is scheduled to be launched automatically at the configured date. No manual dispatch needed.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Launch Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Campaign Launch</h3>
                <p className="text-xs text-zinc-500">Please review target audience details before sending.</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed pt-2">
              You are about to launch <span className="font-bold text-white">"{campaign.name}"</span>. This will send a personalized <span className="font-bold uppercase text-white">{campaign.channel}</span> message to all <span className="font-bold text-indigo-400">{totalMembers}</span> members of the segment.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 rounded-lg text-sm font-semibold transition-colors text-zinc-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLaunch}
                disabled={launchCampaign.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all disabled:opacity-50"
              >
                {launchCampaign.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Launch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
