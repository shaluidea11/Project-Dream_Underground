"use client";

import { use, useState } from "react";
import { useCustomer, useProfileCustomer } from "@/lib/hooks/use-customers";
import { 
  Loader2, 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  TrendingUp, 
  Activity, 
  CalendarDays,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap Next.js 15 async params
  const { id } = use(params);

  const { data: customer, isLoading, error } = useCustomer(id);
  const profileMutation = useProfileCustomer();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col h-full items-center justify-center min-h-[500px] text-zinc-400">
        <p>Failed to load customer profile.</p>
        <Link href="/customers" className="text-indigo-400 hover:text-indigo-300 mt-4">
          ← Back to Customers
        </Link>
      </div>
    );
  }

  const handleAIProfile = () => {
    profileMutation.mutate(id);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/customers"
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            {customer.canonicalName}
            {customer.tags?.map((tag) => (
              <span key={tag} className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {tag}
              </span>
            ))}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
            {customer.email && (
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> {customer.email}</span>
            )}
            {customer.phone && (
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> {customer.phone}</span>
            )}
            {(customer.city || customer.state) && (
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> {[customer.city, customer.state].filter(Boolean).join(', ')}</span>
            )}
          </div>
        </div>
        <div className="ml-auto">
          <button 
            onClick={handleAIProfile}
            disabled={profileMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
          >
            {profileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Profile Sync
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* KPI Cards */}
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 blur-2xl" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 font-medium text-sm">Engagement Score</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white font-mono">{Math.round(customer.engagementScore)}<span className="text-sm text-zinc-500 ml-1">/100</span></p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 blur-2xl" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 font-medium text-sm">Lifetime Value</span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white font-mono">${customer.lifetimeValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 blur-2xl" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 font-medium text-sm">Total Orders</span>
            <ShoppingBag className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white font-mono">{customer.orderCount}</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-bl-full -mr-4 -mt-4 blur-2xl" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 font-medium text-sm">Preferred Channel</span>
            <CalendarDays className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white capitalize">{customer.preferredChannel || 'Email'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order History */}
        <div className="lg:col-span-2 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-400" /> Order History
          </h2>
          
          <div className="relative border-l border-zinc-800 ml-3 space-y-6">
            {(!customer.orders || customer.orders.length === 0) ? (
              <p className="text-zinc-500 pl-6 py-2">No orders recorded.</p>
            ) : (
              customer.orders.map((order) => (
                <div key={order.id} className="relative pl-6 group">
                  <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-zinc-800 border-2 border-indigo-500 group-hover:bg-indigo-400 transition-colors" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">
                        {new Date(order.orderedAt).toLocaleString()}
                      </p>
                      <p className="font-medium text-zinc-100 mt-0.5">
                        Order #{order.externalOrderId || order.id.split('-')[0].toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-zinc-200">
                        ${order.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <span className="inline-flex px-2 py-0.5 mt-1 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audience Segments & Communications */}
        <div className="space-y-8">
          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">Audience Segments</h2>
            {(!customer.segmentMemberships || customer.segmentMemberships.length === 0) ? (
              <p className="text-zinc-500 text-sm">Not currently in any active segments.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {customer.segmentMemberships.map((sm) => (
                  <span key={sm.id} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm border border-zinc-700">
                    Segment ID: {sm.segmentId.split('-')[0]}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Comms</h2>
            {(!customer.communications || customer.communications.length === 0) ? (
              <p className="text-zinc-500 text-sm">No communications logged yet.</p>
            ) : (
              <div className="space-y-3">
                {customer.communications.slice(0, 5).map((comm) => (
                  <div key={comm.id} className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/50">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-semibold uppercase text-zinc-500">{comm.channel}</span>
                      <span className="text-[10px] text-zinc-600">{new Date(comm.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-zinc-300 truncate">{comm.messageBody || "Message content..."}</p>
                    <div className="mt-2 text-right">
                      <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                        {comm.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
