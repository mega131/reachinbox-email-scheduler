import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Gauge,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { DashboardStatsDTO, CampaignDTO } from '@reachinbox/shared';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [statsData, campaignsData] = await Promise.all([
        apiRequest<DashboardStatsDTO>('/dashboard/stats'),
        apiRequest<{ campaigns: CampaignDTO[] }>('/campaigns')
      ]);
      setStats(statsData);
      setCampaigns(campaignsData.campaigns);
    } catch (err: any) {
      console.error('Failed loading dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000); // Live poll every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading Outreach Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner / Hero Metric */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-6 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400 mb-1">
              <Zap className="w-4 h-4 fill-primary-400" />
              <span>Production Outreach Engine</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              High-Concurrency Job Scheduler
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Equipped with Redis-backed atomic token reservation, deterministic BullMQ job queues,
              transactional outbox recovery, and automatic Slack rate-limit alerting.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors shadow-sm"
            >
              <span>Bull Board Monitor</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            <Link
              to="/compose"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-600 shadow-md shadow-primary-500/20 transition-all active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Schedule Outreach</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scheduled */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 glow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Scheduled in Queue</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {stats?.totalScheduled ?? 0}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-blue-400/90 mt-2">
            <span>Delayed & awaiting window</span>
          </div>
        </div>

        {/* Total Sent */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 glow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Total Delivered</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {stats?.totalSent ?? 0}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Success Rate: {stats?.deliverySuccessRate ?? 100}%</span>
          </div>
        </div>

        {/* Rate Limited Deferrals */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 glow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Rate-Limit Deferrals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {stats?.totalRateLimited ?? 0}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 mt-2">
            <span>Protected & auto-rescheduled</span>
          </div>
        </div>

        {/* Failed */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 glow-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Failed Deliveries</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {stats?.totalFailed ?? 0}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-400/90 mt-2">
            <span>Exponential backoff retried</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Live Queue Health & Rate-Limit Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live BullMQ Queue Health */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-400" />
              <h3 className="text-sm font-semibold text-white">BullMQ Real-Time Queue Telemetry</h3>
            </div>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Worker Concurrency: {stats?.workerConcurrency || 5} parallel threads
            </span>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block mb-1">Waiting</span>
              <span className="text-xl font-bold text-slate-200">
                {stats?.queueStatus.waiting ?? 0}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[11px] text-cyan-400 block mb-1">Active</span>
              <span className="text-xl font-bold text-cyan-300">
                {stats?.queueStatus.active ?? 0}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[11px] text-blue-400 block mb-1">Delayed</span>
              <span className="text-xl font-bold text-blue-300">
                {stats?.queueStatus.delayed ?? 0}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[11px] text-emerald-400 block mb-1">Completed</span>
              <span className="text-xl font-bold text-emerald-300">
                {stats?.queueStatus.completed ?? 0}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-[11px] text-rose-400 block mb-1">Failed</span>
              <span className="text-xl font-bold text-rose-300">
                {stats?.queueStatus.failed ?? 0}
              </span>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Persistent Delayed Engine: Redis Sorted Sets (ZSET)</span>
            <span className="font-mono text-primary-300 font-semibold">Strictly Zero Cron</span>
          </div>
        </div>

        {/* Rate Limiting & Capacity Gauge */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-sm font-semibold text-white">Rate Limit Protection</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Atomic coordination prevents worker race conditions and sender reputation damage.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Configured Hourly Limit:</span>
                <span className="font-semibold text-white font-mono">
                  {stats?.configuredHourlyLimit || 200} emails/hr
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Inter-Send Minimum Delay:</span>
                <span className="font-semibold text-white font-mono">
                  {stats?.minDelayMs || 2000} ms
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Slack Alert State:</span>
                <span className="font-semibold text-emerald-400">Armed & Deduplicated</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              to="/settings"
              className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center justify-between group"
            >
              <span>Manage Limits & Slack OAuth</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Campaigns Overview */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-semibold text-white">Active Outreach Campaigns</h3>
          </div>
          <Link
            to="/campaigns"
            className="text-xs font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xs text-slate-400">No campaigns scheduled yet.</p>
            <Link
              to="/compose"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Schedule First Campaign</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Campaign Name</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">Start Time</th>
                  <th className="pb-3">Recipients</th>
                  <th className="pb-3">Progress</th>
                  <th className="pb-3 text-right pr-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {campaigns.slice(0, 5).map((c) => {
                  const sent = c.sentCount || 0;
                  const total = c.totalRecipients || 1;
                  const pct = Math.min(100, Math.round((sent / total) * 100));

                  return (
                    <tr key={c.id} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3.5 pl-2 font-medium text-white">{c.name}</td>
                      <td className="py-3.5 text-slate-300 truncate max-w-xs">{c.subject}</td>
                      <td className="py-3.5 text-slate-400">
                        {new Date(c.startTime).toLocaleString()}
                      </td>
                      <td className="py-3.5 text-slate-300">{c.totalRecipients}</td>
                      <td className="py-3.5 w-48">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-primary-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
