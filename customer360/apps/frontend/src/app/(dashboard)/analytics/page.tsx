"use client";

import { useState, useEffect } from "react";
import { useDashboardHome, useCampaignAnalytics, useCampaignTimeseries, useChannelComparison } from "@/lib/hooks/use-analytics";
import { useCampaigns } from "@/lib/hooks/use-campaigns";
import { Loader2, TrendingUp, Users, Layers, Megaphone, Target, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

export default function AnalyticsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch Home Metrics & Channel Stats
  const { data: homeMetrics, isLoading: isHomeLoading } = useDashboardHome();
  const { data: channelComparison, isLoading: isChannelsLoading } = useChannelComparison();
  const { data: campaigns, isLoading: isCampaignsLoading } = useCampaigns();

  // Selected Campaign Data
  const { data: campaignAnalytics, isLoading: isCampaignAnalyticsLoading } = useCampaignAnalytics(selectedCampaignId);
  const { data: campaignTimeseries, isLoading: isCampaignTimeseriesLoading } = useCampaignTimeseries(selectedCampaignId);

  // Auto-select first campaign once loaded
  useEffect(() => {
    if (campaigns && campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Customers",
      value: homeMetrics?.totalCustomers?.toLocaleString() || "0",
      icon: <Users className="w-5 h-5 text-indigo-400" />,
    },
    {
      label: "Active Segments",
      value: homeMetrics?.totalSegments?.toLocaleString() || "0",
      icon: <Layers className="w-5 h-5 text-purple-400" />,
    },
    {
      label: "Campaigns (This Month)",
      value: homeMetrics?.campaignsThisMonth?.toLocaleString() || "0",
      icon: <Megaphone className="w-5 h-5 text-amber-400" />,
    },
  ];

  // Map campaign aggregates to horizontal bar chart format for Funnel rendering
  const funnelData = campaignAnalytics?.metrics
    ? [
        { name: "Sent", count: campaignAnalytics.metrics.totalSent },
        { name: "Delivered", count: campaignAnalytics.metrics.totalDelivered },
        { name: "Opened", count: campaignAnalytics.metrics.totalOpened },
        { name: "Clicked", count: campaignAnalytics.metrics.totalClicked },
        { name: "Converted", count: campaignAnalytics.metrics.totalConverted },
      ]
    : [];

  // Format timestamp strings for Recharts XAxis
  const formattedTimeseries = campaignTimeseries?.map((point) => ({
    ...point,
    time: new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  })) || [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-zinc-100">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Analytics Dashboard
        </h1>
        <p className="text-zinc-400 mt-1">
          Monitor your cross-channel conversion rates and customer engagement.
        </p>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {isHomeLoading ? (
          <div className="md:col-span-4 flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
          </div>
        ) : (
          <>
            {kpis.map((kpi, idx) => (
              <div key={idx} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{kpi.label}</span>
                  <p className="text-2xl font-extrabold font-mono text-zinc-100 mt-1">{kpi.value}</p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850">{kpi.icon}</div>
              </div>
            ))}

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Top Campaign</span>
                <p className="text-sm font-bold text-zinc-200 mt-1.5 truncate max-w-[150px]">
                  {homeMetrics?.bestCampaign?.name || "None"}
                </p>
                {homeMetrics?.bestCampaign && (
                  <span className="text-xs text-indigo-400 font-mono font-bold">
                    {homeMetrics.bestCampaign.conversionRate.toFixed(1)}% Conversion
                  </span>
                )}
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Performance Grid */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white border-b border-zinc-850 pb-3">Channel Comparison</h3>
          {isChannelsLoading ? (
            <div className="flex-1 flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : !channelComparison || channelComparison.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-24 text-zinc-600">
              No channel communications history found.
            </div>
          ) : (
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="channel" stroke="#a1a1aa" className="text-xs uppercase" />
                  <YAxis stroke="#a1a1aa" className="text-xs" unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="deliveryRate" name="Delivery" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="openRate" name="Open" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clickRate" name="Click" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conversionRate" name="Conversion" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Campaign Analytics Selector & Funnel */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-850 pb-3 gap-3">
            <h3 className="text-lg font-bold text-white">Campaign Funnel</h3>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="px-3 py-1.5 bg-zinc-950 border border-zinc-805 rounded-lg text-zinc-300 focus:outline-none focus:border-indigo-500 text-xs w-fit max-w-[200px]"
            >
              <option value="">Select campaign...</option>
              {campaigns?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {isCampaignAnalyticsLoading ? (
            <div className="flex-1 flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : !campaignAnalytics ? (
            <div className="flex-1 flex items-center justify-center py-24 text-zinc-600">
              Select a campaign to load funnel metrics.
            </div>
          ) : (
            <div className="w-full h-80 pt-2 flex flex-col md:flex-row gap-5 items-center">
              {/* Recharts Funnel Vertical Bars */}
              <div className="flex-1 w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={funnelData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" stroke="#a1a1aa" className="text-xs" />
                    <YAxis type="category" dataKey="name" stroke="#a1a1aa" className="text-xs" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                      itemStyle={{ color: "#e4e4e7" }}
                    />
                    <Bar dataKey="count" name="Count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Conversion Summaries */}
              <div className="flex flex-col gap-3 w-full md:w-48 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Delivery Rate</span>
                  <p className="text-lg font-bold font-mono text-emerald-400">
                    {campaignAnalytics.metrics.deliveryRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Click-To-Open</span>
                  <p className="text-lg font-bold font-mono text-purple-400">
                    {campaignAnalytics.metrics.clickRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Conversion Rate</span>
                  <p className="text-lg font-bold font-mono text-pink-400">
                    {campaignAnalytics.metrics.conversionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cumulative Event Timeseries Chart */}
      {selectedCampaignId && campaignAnalytics && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white border-b border-zinc-850 pb-3">Campaign Timeline (Cumulative Events)</h3>
          {isCampaignTimeseriesLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : formattedTimeseries.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-zinc-600">
              No delivery timeline events found for this campaign yet.
            </div>
          ) : (
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedTimeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#a1a1aa" className="text-xs" />
                  <YAxis stroke="#a1a1aa" className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="opened" name="Opened" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="clicked" name="Clicked" stroke="#a855f7" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="converted" name="Converted" stroke="#ec4899" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
