import React from 'react';
import { X, ExternalLink, Clock, Send, AlertTriangle, CheckCircle2, Hash, Mail } from 'lucide-react';
import { EmailRecordDTO, EmailStatus } from '@reachinbox/shared';

interface EmailDetailModalProps {
  email: EmailRecordDTO | null;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  const getStatusBadge = (status: EmailStatus) => {
    switch (status) {
      case EmailStatus.SENT:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sent Successfully
          </span>
        );
      case EmailStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case EmailStatus.RATE_LIMITED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Rate Limited (Deferred)
          </span>
        );
      case EmailStatus.SENDING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Send className="w-3.5 h-3.5 animate-pulse" /> Sending...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" /> Scheduled in Queue
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/30 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Email Dispatch Details</h3>
              <p className="text-xs text-slate-400">Record ID: {email.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {/* Status and Action banner */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 mb-1">Current Delivery Status</div>
              {getStatusBadge(email.status)}
            </div>

            {email.etherealPreviewUrl && (
              <a
                href={email.etherealPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 transition-colors shadow-md shadow-primary-500/20"
              >
                <span>View on Ethereal.email</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Recipient</span>
              <span className="font-medium text-slate-200 break-all">{email.recipientEmail}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Campaign</span>
              <span className="font-medium text-slate-200">{email.campaignName || email.campaignId}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Scheduled For</span>
              <span className="font-medium text-slate-200">
                {new Date(email.scheduledTime).toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Sent At</span>
              <span className="font-medium text-slate-200">
                {email.sentTime ? new Date(email.sentTime).toLocaleString() : 'Pending send'}
              </span>
            </div>
          </div>

          {/* BullMQ Job Info */}
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Hash className="w-4 h-4 text-primary-400" />
              <span>BullMQ Deterministic Job ID:</span>
            </div>
            <span className="font-mono text-slate-300 font-medium">{email.bullmqJobId || 'Pending queue insertion'}</span>
          </div>

          {/* Rate-limit deferral alert if applicable */}
          {email.rateLimitDeferredUntil && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <div className="font-semibold mb-0.5">Rate Limit Protection Triggered</div>
              Hourly quota reached. This email is queued to automatically resume on:{' '}
              <span className="font-bold underline">{new Date(email.rateLimitDeferredUntil).toLocaleString()}</span>
            </div>
          )}

          {/* Failure message if applicable */}
          {email.failureReason && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <div className="font-semibold mb-0.5">Failure Reason:</div>
              {email.failureReason}
            </div>
          )}

          {/* Subject & Rendered Body */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-semibold text-slate-300">
              Subject: {email.subject}
            </div>
            <div className="p-4 bg-slate-950 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
              {email.body}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
