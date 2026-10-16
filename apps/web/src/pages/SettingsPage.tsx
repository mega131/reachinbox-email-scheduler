import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Slack,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Bell,
  User,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { SlackConnectionDTO } from '@reachinbox/shared';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [slack, setSlack] = useState<SlackConnectionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSlackStatus = async () => {
    try {
      const data = await apiRequest<SlackConnectionDTO>('/slack/status');
      setSlack(data);
    } catch (err: any) {
      console.warn('Failed to load Slack status:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlackStatus();
  }, []);

  const handleConnectSlack = () => {
    window.location.href = '/api/slack/connect';
  };

  const handleDisconnectSlack = async () => {
    if (!confirm('Are you sure you want to disconnect Slack rate-limit notifications?')) return;
    try {
      await apiRequest('/slack/connection', { method: 'DELETE' });
      await fetchSlackStatus();
      setTestResult(null);
    } catch (err: any) {
      alert(`Failed to disconnect: ${err.message}`);
    }
  };

  const handleSendTestNotification = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/slack/test-notification', {
        method: 'POST'
      });
      setTestResult({ success: true, message: res.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Notification delivery failed' });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold text-[#111827] tracking-tight">Integrations & Settings</h2>
        <p className="text-xs text-[#6B7280] mt-1">
          Configure real-time Slack rate-limit notifications, Google OAuth session, and queue telemetry.
        </p>
      </div>

      {/* Slack OAuth Banner if redirected */}
      {searchParams.get('slack') === 'connected' && (
        <div className="p-4 rounded-xl bg-[#E8F5E9] border border-[#A7F3D0] text-xs text-[#00A36C] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Slack OAuth connected successfully! Rate-limit alerts are armed.</span>
        </div>
      )}

      {/* 1. Slack OAuth Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center">
              <Slack className="w-5 h-5 text-[#E01E5A]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Slack Real-Time Notifications</h3>
              <p className="text-xs text-[#6B7280]">
                Receive instant alerts when outreach senders reach the configured hourly limit.
              </p>
            </div>
          </div>

          {slack?.connected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#00A36C] border border-[#A7F3D0]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#6B7280]">
              Disconnected
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-xs text-[#9CA3AF]">Checking connection state...</div>
        ) : slack?.connected ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs">
              <div>
                <span className="text-[#6B7280] block mb-0.5">Connected Workspace</span>
                <span className="font-semibold text-[#111827]">{slack.teamName || slack.teamId}</span>
              </div>
              <div>
                <span className="text-[#6B7280] block mb-0.5">Notification Channel</span>
                <span className="font-semibold text-[#111827]">
                  {slack.channelName ? `#${slack.channelName}` : 'Incoming Webhook Target'}
                </span>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-[#E8F5E9] border-[#A7F3D0] text-[#00A36C]'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSendTestNotification}
                disabled={testSending}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white bg-[#00A36C] hover:bg-[#008f5d] transition-colors shadow-sm disabled:opacity-50"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{testSending ? 'Delivering alert to Slack...' : 'Send Test Notification'}</span>
              </button>

              <button
                type="button"
                onClick={handleDisconnectSlack}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect Slack</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2">
            <button
              onClick={handleConnectSlack}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#4A154B] hover:bg-[#5e1a5f] transition-all shadow-sm"
            >
              <Slack className="w-4 h-4 text-[#E01E5A]" />
              <span>Connect Slack (OAuth 2.0)</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Google OAuth Profile */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Google OpenID Connect Session</h3>
            <p className="text-xs text-[#6B7280]">Authenticated user profile details</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#6B7280] block mb-0.5">Operator Name</span>
            <span className="font-semibold text-[#111827]">{user?.name || 'Oliver Brown'}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block mb-0.5">Email</span>
            <span className="font-semibold text-[#111827]">{user?.email || 'oliver.brown@domain.io'}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block mb-0.5">Google Subject ID (sub)</span>
            <span className="font-mono text-[#374151]">{user?.googleId}</span>
          </div>
          <div>
            <span className="text-[#6B7280] block mb-0.5">Cookie Security</span>
            <span className="font-semibold text-[#00A36C]">HttpOnly • Lax • 7 Days Expiration</span>
          </div>
        </div>
      </div>

      {/* 3. Bull Board Queue Telemetry */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#00A36C]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827]">Bull Board Queue Administration</h3>
            <p className="text-xs text-[#6B7280]">
              Inspect delayed, active, and completed email outreach jobs in real time.
            </p>
          </div>
        </div>

        <a
          href="/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-[#111827] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors"
        >
          <span>Open Bull Board</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
