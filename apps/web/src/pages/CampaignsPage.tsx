import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, Calendar, Clock, Gauge, ArrowRight } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { CampaignDTO } from '@reachinbox/shared';

export const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      const data = await apiRequest<{ campaigns: CampaignDTO[] }>('/campaigns');
      setCampaigns(data.campaigns);
    } catch (err: any) {
      console.error('Failed to load campaigns:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Campaign Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Track outbound campaigns, delivery progress, and recipient engagement.
          </p>
        </div>

        <Link
          to="/compose"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-md shadow-primary-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Campaign</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No campaigns found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You have not scheduled any outreach campaigns yet. Start your first outbound sequence now.
          </p>
          <Link
            to="/compose"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Campaign</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            const sent = c.sentCount || 0;
            const total = c.totalRecipients || 1;
            const pct = Math.min(100, Math.round((sent / total) * 100));

            return (
              <div
                key={c.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 glow-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">{c.name}</h3>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/20 shrink-0">
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1 mb-4">
                    Subject: {c.subject}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {sent} of {c.totalRecipients} sent
                      </span>
                      <span className="font-mono text-primary-300 font-semibold">{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-primary-600 to-accent-cyan h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Scheduled</span>
                      <span className="font-semibold text-slate-300 font-mono">
                        {c.scheduledCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Sent</span>
                      <span className="font-semibold text-emerald-400 font-mono">
                        {c.sentCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Failed</span>
                      <span className="font-semibold text-rose-400 font-mono">
                        {c.failedCount || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-accent-cyan" />
                      {c.minDelayMs}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-amber-400" />
                      {c.hourlyLimit}/hr
                    </span>
                  </div>

                  <Link
                    to={`/emails?campaignId=${c.id}`}
                    className="flex items-center gap-1 text-primary-400 hover:text-primary-300 font-medium"
                  >
                    <span>View Emails</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
