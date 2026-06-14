"use client";

import { useCampaigns } from "@/lib/hooks/use-campaigns";
import Link from "next/link";
import { Loader2, Plus, Megaphone, Calendar, Send, CheckCircle2, AlertCircle } from "lucide-react";

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-800 text-zinc-300">Draft</span>;
      case "scheduled":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">Scheduled</span>;
      case "running":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit"><Loader2 className="w-3 h-3 animate-spin" /> Running</span>;
      case "completed":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Completed</span>;
      case "paused":
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/15 text-red-400 border border-red-500/20">Paused</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-800 text-zinc-400">{status}</span>;
    }
  };

  const getChannelBadge = (channel: string) => {
    const channelLower = channel.toLowerCase();
    switch (channelLower) {
      case "whatsapp":
        return <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded bg-green-500/10 text-green-400">WhatsApp</span>;
      case "email":
        return <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded bg-indigo-500/10 text-indigo-400">Email</span>;
      case "sms":
        return <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded bg-purple-500/10 text-purple-400">SMS</span>;
      case "rcs":
        return <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded bg-cyan-500/10 text-cyan-400">RCS</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded bg-zinc-800 text-zinc-400">{channel}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Campaigns
          </h1>
          <p className="text-zinc-400 mt-1">
            Build and launch targeted customer outreach.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </Link>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            Loading campaigns...
          </div>
        ) : !campaigns || campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <Megaphone className="w-12 h-12 mb-3 opacity-20" />
            <p>No campaigns created yet.</p>
            <Link
              href="/campaigns/new"
              className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm"
            >
              Create your first campaign →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase tracking-wider bg-zinc-900/30">
                  <th className="px-6 py-4">Campaign Name</th>
                  <th className="px-6 py-4">Target Segment</th>
                  <th className="px-6 py-4">Channel</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Delivered / Sent</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="hover:bg-zinc-800/20 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-zinc-100 group-hover:text-white">
                      <Link href={`/campaigns/${campaign.id}`} className="block w-full h-full">
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-zinc-300">
                      <Link href={`/campaigns/${campaign.id}`} className="block w-full h-full">
                        {campaign.segment?.name || "Lapsed Segment"}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/campaigns/${campaign.id}`} className="block w-full h-full">
                        {getChannelBadge(campaign.channel)}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/campaigns/${campaign.id}`} className="block w-full h-full">
                        {getStatusBadge(campaign.status)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-200">
                      <Link href={`/campaigns/${campaign.id}`} className="block w-full h-full">
                        {campaign.analytics
                          ? `${campaign.analytics.totalDelivered} / ${campaign.analytics.totalSent}`
                          : "0 / 0"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      <Link href={`/campaigns/${campaign.id}`} className="block w-full h-full">
                        {campaign.scheduledAt ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Scheduled: {new Date(campaign.scheduledAt).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                        )}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
