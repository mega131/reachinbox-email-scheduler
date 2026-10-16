import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Database,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
  Inbox
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { EmailRecordDTO, EmailStatus, PaginatedResult } from '@reachinbox/shared';
import { ReadingViewModal } from '../components/ReadingViewModal';
import { ComposeModal } from '../components/ComposeModal';

interface EmailsPageProps {
  searchQuery?: string;
  isComposeOpen?: boolean;
  onCloseCompose?: () => void;
  onOpenCompose?: () => void;
  onCountsUpdate?: (counts: { inbox: number; scheduled: number; sent: number }) => void;
}

export const EmailsPage: React.FC<EmailsPageProps> = ({
  searchQuery = '',
  isComposeOpen = false,
  onCloseCompose,
  onOpenCompose,
  onCountsUpdate
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab') || 'scheduled';
  const [tabCounts, setTabCounts] = useState({ scheduled: 0, sent: 0, all: 0 });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaginatedResult<EmailRecordDTO>>({
    data: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    }
  });

  const [selectedEmail, setSelectedEmail] = useState<EmailRecordDTO | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      let endpoint = `/emails/scheduled?page=${page}&limit=20`;
      if (currentTab === 'sent') {
        endpoint = `/emails/sent?page=${page}&limit=20`;
      } else if (currentTab === 'all') {
        endpoint = `/search?page=${page}&limit=20`;
      }

      if (searchQuery.trim()) {
        endpoint = `/search?q=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`;
      }

      const res = await apiRequest<PaginatedResult<EmailRecordDTO>>(endpoint);
      setResult(res);

      // Fetch overall counts for sidebar badges
      const [allRes, scheduledRes, sentRes] = await Promise.all([
        apiRequest<PaginatedResult<EmailRecordDTO>>('/search?page=1&limit=1'),
        apiRequest<PaginatedResult<EmailRecordDTO>>('/emails/scheduled?page=1&limit=1'),
        apiRequest<PaginatedResult<EmailRecordDTO>>('/emails/sent?page=1&limit=1')
      ]);

      setTabCounts({
        all: allRes.pagination.total,
        scheduled: scheduledRes.pagination.total,
        sent: sentRes.pagination.total
      });

      if (onCountsUpdate) {
        onCountsUpdate({
          inbox: allRes.pagination.total,
          scheduled: scheduledRes.pagination.total,
          sent: sentRes.pagination.total
        });
      }
    } catch (err: any) {
      console.warn('Failed to load emails:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [currentTab, page, searchQuery]);

  return (
    <div className="bg-white flex flex-col min-h-screen font-sans">
      {/* 1. Sub-Header with Tabs & Primary Compose Button as specified in requirements */}
      <div className="px-6 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/emails?tab=scheduled')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'scheduled'
                ? 'bg-[#E8F5E9] text-[#00A36C] border border-[#A7F3D0] shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled Emails</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-white/80 border border-[#E5E7EB]">
              {tabCounts.scheduled}
            </span>
          </button>

          <button
            onClick={() => navigate('/emails?tab=sent')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'sent'
                ? 'bg-[#E8F5E9] text-[#00A36C] border border-[#A7F3D0] shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Sent Emails</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-white/80 border border-[#E5E7EB]">
              {tabCounts.sent}
            </span>
          </button>

          <button
            onClick={() => navigate('/emails?tab=all')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              currentTab === 'all'
                ? 'bg-[#E8F5E9] text-[#00A36C] border border-[#A7F3D0] shadow-xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>All Emails</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-white/80 border border-[#E5E7EB]">
              {tabCounts.all}
            </span>
          </button>
        </div>

        <button
          onClick={onOpenCompose}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#00A36C] text-white text-xs font-semibold hover:bg-[#008f5d] transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Compose New Email</span>
        </button>
      </div>

      {/* 2. Email List Feed - Matching Figma Homepage middle frames */}
      <div className="flex-1">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#9CA3AF]">
            Loading emails...
          </div>
        ) : result.data.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-sm font-semibold text-[#111827] mb-1">No emails in this folder</div>
            <p className="text-xs text-[#6B7280] mb-4">
              Schedule outreach messages with atomic delays and hourly quotas.
            </p>
            <button
              onClick={onOpenCompose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00A36C] text-white text-xs font-semibold hover:bg-[#008f5d] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Compose Email</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {result.data.map((email) => {
              const isScheduled = email.status === EmailStatus.SCHEDULED || email.status === EmailStatus.QUEUED || email.status === EmailStatus.RATE_LIMITED;
              const isSent = email.status === EmailStatus.SENT;

              return (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#F9FAFB] cursor-pointer transition-colors group select-none text-xs"
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded text-[#00A36C] border-[#D1D5DB] focus:ring-[#00A36C] cursor-pointer"
                  />

                  {/* Recipient / Name */}
                  <div className="w-44 font-semibold text-[#111827] truncate shrink-0">
                    To: {email.recipientEmail.split('@')[0]}
                  </div>

                  {/* Status Pill matching Figma: Amber "Due: date" or Green "Sent" */}
                  <div className="shrink-0 w-36">
                    {isScheduled ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                        <Clock className="w-3 h-3 text-[#B45309]" />
                        <span>
                          Due: {new Date(email.scheduledTime).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}{' '}
                          {new Date(email.scheduledTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </span>
                    ) : isSent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#E8F5E9] text-[#00A36C] border border-[#A7F3D0]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    )}
                  </div>

                  {/* Subject and Body Snippet */}
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 text-xs text-[#6B7280] truncate">
                    <span className="font-bold text-[#111827] shrink-0 truncate max-w-xs">
                      {email.subject}
                    </span>
                    <span className="text-[#9CA3AF] shrink-0">-</span>
                    <span className="truncate text-[#4B5563]">
                      {email.body.replace(/\n/g, ' ')}
                    </span>
                  </div>

                  {/* Timestamp on Far Right - Matches Figma */}
                  <div className="text-right text-[11px] font-medium text-[#9CA3AF] shrink-0 w-24">
                    {email.sentTime
                      ? new Date(email.sentTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                      : new Date(email.scheduledTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>

                  {/* Ethereal Quick Link if sent */}
                  {email.etherealPreviewUrl && (
                    <a
                      href={email.etherealPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 text-[#00A36C] hover:text-[#008f5d] transition-opacity shrink-0 p-1"
                      title="Open Live Ethereal Preview"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {result.pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
            <div>
              Page {result.pagination.page} of {result.pagination.totalPages} ({result.pagination.total} records)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!result.pagination.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={!result.pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reading View Modal */}
      <ReadingViewModal
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
      />

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={onCloseCompose || (() => {})}
        onScheduledSuccess={() => {
          fetchEmails();
        }}
      />
    </div>
  );
};
