"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSegments } from "@/lib/hooks/use-segments";
import { useCreateCampaign, useAIGenerateCampaign } from "@/lib/hooks/use-campaigns";
import { Loader2, ArrowLeft, Send, Sparkles, MessageSquare, AlertCircle, Info } from "lucide-react";
import Link from "next/link";

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: segments, isLoading: segmentsLoading, refetch: refetchSegments } = useSegments();
  const createCampaign = useCreateCampaign();
  const aiGenerate = useAIGenerateCampaign();

  // Mode: manual or ai
  const [mode, setMode] = useState<"manual" | "ai">("manual");

  // Form State
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "sms" | "email" | "rcs">("whatsapp");
  const [messageBody, setMessageBody] = useState("");
  const [subject, setSubject] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // AI goal input state
  const [goal, setGoal] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [savingSegment, setSavingSegment] = useState(false);

  // Pre-fill parameters if redirected from Trend Insights
  useEffect(() => {
    const insightId = searchParams.get("insightId");
    if (insightId) {
      const pName = searchParams.get("name") || "";
      const pChannel = searchParams.get("channel") || "whatsapp";
      const pMessage = searchParams.get("message") || "";
      const pSegmentName = searchParams.get("segmentName") || "";
      const pSegmentDesc = searchParams.get("segmentDesc") || "";
      const pSegmentAst = searchParams.get("segmentAst") || "";

      setName(pName);
      setChannel(pChannel as any);
      setMessageBody(pMessage);

      if (pSegmentName && pSegmentAst) {
        const autoCreateSegment = async () => {
          setSavingSegment(true);
          setErrorMsg("");
          try {
            const res = await fetch("/api/segments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: pSegmentName,
                description: pSegmentDesc,
                filterDefinition: JSON.parse(pSegmentAst),
                nlQuery: `Auto-generated from trend insight`,
              }),
            });

            if (!res.ok) {
              throw new Error("Failed to auto-create segment from insight.");
            }

            const segment = await res.json();
            // Refetch segments and set selected segment ID
            await refetchSegments();
            setSegmentId(segment.id);
          } catch (err: any) {
            setErrorMsg(err.message || "Failed to auto-create segment from insight.");
          } finally {
            setSavingSegment(false);
          }
        };
        autoCreateSegment();
      }
    }
  }, [searchParams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !segmentId || !messageBody) {
      setErrorMsg("Please fill in name, segment, and message body.");
      return;
    }
    setErrorMsg("");

    try {
      await createCampaign.mutateAsync({
        name,
        segmentId,
        channel,
        messageBody,
        subject: channel === "email" ? subject : undefined,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      });
      router.push("/campaigns");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create campaign.");
    }
  };

  const handleAIGenerate = async () => {
    if (!goal) {
      setErrorMsg("Please input a campaign goal.");
      return;
    }
    setErrorMsg("");

    try {
      const result = await aiGenerate.mutateAsync(goal);
      
      // Auto-create/pre-fill manual form with suggestion
      setName(`AI: ${goal.slice(0, 30)}`);
      setChannel(result.channel_recommendation);
      setMessageBody(result.message);
      setSubject(result.subject || "");
      setCtaText(result.cta_text || "");
      setCtaUrl(result.cta_url || "");
      
      // Attempt to auto-match or pre-select a segment if possible,
      // or we can show a special AI suggestion box and let them create the segment or select one.
      // Wait, let's look at the suggestion: result.suggested_segment.filter_ast
      // If we can create a segment for the user automatically, or let them pick one.
      // Actually, let's create a segment on the fly or prompt them to pick a segment that matches.
      // Better yet, let's save the generated segment as a new Segment, or let them select one of the existing segments.
      // Wait, the PRD says:
      // "Click 'Use This Campaign' -> form pre-filled with suggestion"
      // Wait, if it has a `suggested_segment`, can we create this segment first or pre-fill the form?
      // Yes! We can first create a new segment with the AI-suggested FilterAST and description, and then select it!
      // Let's implement that:
      // When they click "Use This Campaign", we call `POST /segments` using `useCreateSegment` to save the segment,
      // then once the segment is saved, we set `segmentId` to its ID and populate the rest of the campaign builder fields!
      // This is a completely automated, delightful AI-driven campaign flow!
      // Let's implement this nested creation.
      
      // Let's store the suggestion first so they can review it!
      setAiSuggestion(result);
    } catch (err: any) {
      setErrorMsg(err.message || "AI failed to generate a campaign.");
    }
  };

  const applyAISuggestion = async () => {
    if (!aiSuggestion) return;
    setSavingSegment(true);
    setErrorMsg("");

    try {
      // Create segment
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Segment: ${goal.slice(0, 30)}`,
          description: aiSuggestion.suggested_segment.description,
          filterDefinition: aiSuggestion.suggested_segment.filter_ast,
          nlQuery: goal,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to auto-create segment for campaign.");
      }

      const segment = await res.json();
      setSegmentId(segment.id);
      setMode("manual");
      setAiSuggestion(null);
      setGoal("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to register AI segment.");
    } finally {
      setSavingSegment(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-100">
      <div className="flex items-center gap-4">
        <Link
          href="/campaigns"
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Create Campaign
          </h1>
          <p className="text-zinc-400 mt-1">
            Build a campaign manually or generate one with AI.
          </p>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 w-fit">
        <button
          onClick={() => {
            setMode("manual");
            setAiSuggestion(null);
            setErrorMsg("");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            mode === "manual"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Manual Builder
        </button>
        <button
          onClick={() => {
            setMode("ai");
            setErrorMsg("");
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            mode === "ai"
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
              : "text-zinc-400 hover:text-indigo-400"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Generator
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {mode === "manual" ? (
        <form onSubmit={handleCreate} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-300">Campaign Name</label>
              <input
                type="text"
                placeholder="e.g. Winter Sale Warmup"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-300">Target Segment</label>
              <select
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 focus:outline-none focus:border-indigo-500 text-sm"
                required
              >
                <option value="">Select a segment...</option>
                {segments?.map((seg) => (
                  <option key={seg.id} value={seg.id}>
                    {seg.name} ({seg.customerCount} members)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-300">Messaging Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 focus:outline-none focus:border-indigo-500 text-sm"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="rcs">RCS</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-300">Schedule Launch (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          {channel === "email" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-300">Email Subject Line</label>
              <input
                type="text"
                placeholder="e.g. Hey {{customer.name}}, we have an offer for you!"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-300">Message Body</label>
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Info className="w-3 h-3" /> Supports variables: {"{{customer.name}}"}, {"{{customer.city}}"}, {"{{order.last_amount}}"}
              </span>
            </div>
            <textarea
              placeholder="Write your message content..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={5}
              className="px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-300">CTA Button Text (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Shop Now"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-300">CTA Redirect URL (Optional)</label>
              <input
                type="url"
                placeholder="e.g. https://brand.com/store"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="px-4 py-2.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <Link
              href="/campaigns"
              className="px-5 py-2.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 rounded-lg text-sm font-semibold transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createCampaign.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
            >
              {createCampaign.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Campaign
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-zinc-300">What is the campaign goal?</label>
              <textarea
                placeholder="Describe your marketing objective, e.g. Re-engage premium customers who spent over 2000 but haven't ordered in the last 30 days"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={4}
                className="px-4 py-3 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={aiGenerate.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                {aiGenerate.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate Campaign Plan
              </button>
            </div>
          </div>

          {aiSuggestion && (
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400" /> AI Proposal
                  </h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Review the generated target segment and copy.</p>
                </div>
                <div className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold">
                  <span>Channel: {aiSuggestion.channel_recommendation}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Suggested Segment</h4>
                    <p className="text-sm font-semibold text-white mt-1">{aiSuggestion.suggested_segment.description}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold font-mono text-indigo-400">{aiSuggestion.estimatedSize}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">matching customers</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">AI Reasoning</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{aiSuggestion.reasoning}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Copy Preview</h4>
                  
                  {aiSuggestion.subject && (
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">Subject:</span>
                      <p className="text-sm font-medium text-white">{aiSuggestion.subject}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Message:</span>
                    <p className="text-sm font-medium text-white whitespace-pre-wrap leading-relaxed mt-0.5">{aiSuggestion.message}</p>
                  </div>

                  {aiSuggestion.cta_text && (
                    <div className="mt-2 pt-3 border-t border-zinc-900 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">CTA Button:</span>
                        <p className="text-xs text-indigo-400 underline truncate max-w-[150px]">{aiSuggestion.cta_url}</p>
                      </div>
                      <span className="px-3 py-1.5 bg-indigo-600 rounded text-xs font-semibold text-white">{aiSuggestion.cta_text}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setAiSuggestion(null)}
                  className="px-5 py-2.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 rounded-lg text-sm font-semibold transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={applyAISuggestion}
                  disabled={savingSegment}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {savingSegment && <Loader2 className="w-4 h-4 animate-spin" />}
                  Use This Campaign
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
