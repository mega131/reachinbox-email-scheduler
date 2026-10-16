import React from 'react';
import { ArrowLeft, ExternalLink, Paperclip, Clock, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { EmailRecordDTO, EmailStatus } from '@reachinbox/shared';

interface ReadingViewModalProps {
  email: EmailRecordDTO | null;
  onClose: () => void;
}

export const ReadingViewModal: React.FC<ReadingViewModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  const initials = email.recipientEmail.substring(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fade-in font-sans">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-[#E5E7EB] overflow-hidden">
        {/* 1. Header: Back Arrow + Thread Title - Matches Figma frame top-right */}
        <div className="h-14 px-6 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-semibold text-[#111827] hover:text-[#00A36C] transition-colors truncate max-w-xl"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">Oliver, hello there! | {email.subject}</span>
          </button>

          {/* Action on top right: Open Ethereal Preview */}
          {email.etherealPreviewUrl && (
            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#00A36C] hover:bg-[#c8e6c9] transition-colors border border-[#A7F3D0]"
            >
              <span>Open on Ethereal.email</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* 2. Sender and Recipient Row */}
        <div className="p-6 border-b border-[#F3F4F6] flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#00A36C] text-white font-semibold flex items-center justify-center text-sm shrink-0">
              {initials}
            </div>
            <div>
              <div className="text-sm font-bold text-[#111827]">
                To: {email.recipientEmail}
              </div>
              <div className="text-xs text-[#6B7280]">
                From: {email.senderEmail || 'oliver.brown@domain.io'}
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-[#9CA3AF]">
            {email.sentTime
              ? new Date(email.sentTime).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : new Date(email.scheduledTime).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
          </div>
        </div>

        {/* 3. Message Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap font-sans">
            {email.body}
          </div>

          {/* Figma Style Highlight Callout Box */}
          <div className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E] space-y-1">
            <div className="font-bold">
              Extremely Exclusive — Automated Outreach Batch
            </div>
            <p>
              This job was processed by BullMQ with atomic distributed delay coordination and persistent Redis queues.
            </p>
          </div>

          {/* Figma Sample Attachment Cards */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#6B7280] flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments (2)</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-xs hover:border-[#00A36C] cursor-pointer transition-colors w-60">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#00A36C] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[#111827] truncate">Outreach_Deck.pdf</div>
                  <div className="text-[10px] text-[#9CA3AF]">1.2 MB</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-xs hover:border-[#00A36C] cursor-pointer transition-colors w-60">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[#111827] truncate">Product_Specs.pdf</div>
                  <div className="text-[10px] text-[#9CA3AF]">840 KB</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Footer info */}
        <div className="h-14 px-6 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between text-xs text-[#6B7280]">
          <div>
            BullMQ Job ID: <span className="font-mono text-[#111827]">{email.bullmqJobId}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[#D1D5DB] hover:bg-white text-xs font-semibold text-[#374151]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
