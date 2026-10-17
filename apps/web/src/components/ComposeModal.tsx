import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  ChevronDown,
  Upload,
  Undo2,
  Redo2,
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  Image,
  Check,
  X
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RecipientItem } from '@reachinbox/shared';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduledSuccess?: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onScheduledSuccess
}) => {
  if (!isOpen) return null;

  const { user } = useAuth();
  const navigate = useNavigate();

  // Form State
  const fromEmail = user?.email || 'user@reachinbox.ai';
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState('02');
  const [hourlyLimit, setHourlyLimit] = useState('50');

  // Recipients State - starts empty for real user leads
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [detectedMessage, setDetectedMessage] = useState<string | null>(null);

  // Send Later Popover State
  const [showSendLaterPopover, setShowSendLaterPopover] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('tomorrow-10am');
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Parse and commit whatever is typed in recipientInput
  const commitRecipientInput = (): RecipientItem[] => {
    if (!recipientInput.trim()) return recipients;
    const items = recipientInput
      .split(/[,;\s]+/)
      .map((s) => s.trim().replace(/['"<>]/g, ''))
      .filter((s) => s.includes('@'));

    if (items.length > 0) {
      const updated = [...recipients];
      for (const email of items) {
        if (!updated.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
          updated.push({ email });
        }
      }
      setRecipients(updated);
      setRecipientInput('');
      return updated;
    }
    return recipients;
  };

  // Add individual recipient
  const handleAddRecipient = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitRecipientInput();
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r.email !== email));
  };

  // CSV List Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await apiRequest<{
        validCount: number;
        preview: RecipientItem[];
      }>('/campaigns/parse-recipients', {
        method: 'POST',
        body: formData
      });

      if (result.preview && result.preview.length > 0) {
        setRecipients(result.preview);
        setDetectedMessage(`${result.validCount} email addresses detected from file`);
        setFormError(null);
      }
    } catch (err: any) {
      setFormError(`CSV Upload Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Calculate actual scheduled Date from preset
  const calculateScheduledTime = (): string => {
    const now = new Date();
    if (selectedPreset === 'custom') {
      return new Date(customDateTime).toISOString();
    }
    if (selectedPreset === 'tomorrow') {
      const d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return d.toISOString();
    }
    if (selectedPreset === 'tomorrow-10am') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0);
      return d.toISOString();
    }
    if (selectedPreset === 'tomorrow-1pm') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 13, 0, 0);
      return d.toISOString();
    }
    if (selectedPreset === 'tomorrow-3pm') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 0, 0);
      return d.toISOString();
    }
    // Default 5 seconds future
    return new Date(now.getTime() + 5000).toISOString();
  };

  const handleScheduleSubmit = async (instant = false) => {
    const targetRecipients = commitRecipientInput();

    if (targetRecipients.length === 0) {
      setFormError('Please enter a recipient email in the "To" box (e.g. client@domain.com) or click "Upload List".');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      const scheduledIso = instant
        ? new Date(Date.now() + 2000).toISOString()
        : calculateScheduledTime();

      const delayMs = (parseInt(delayBetweenEmails) || 2) * 1000;
      const limit = parseInt(hourlyLimit) || 50;

      const payload = {
        name: subject ? `Campaign: ${subject}` : `Outreach Batch #${Date.now().toString().slice(-4)}`,
        subject: subject || 'No Subject',
        body: body || 'Hi there,\n\nFollowing up on our conversation.',
        startTime: scheduledIso,
        minDelayMs: delayMs,
        hourlyLimit: limit,
        idempotencyKey: `campaign-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        recipients: targetRecipients
      };

      await apiRequest('/campaigns', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setShowSendLaterPopover(false);
      onClose();

      // Reset form fields
      setSubject('');
      setBody('');
      setRecipients([]);
      setRecipientInput('');

      // Auto-navigate to Sent tab if sent now, or Scheduled tab if scheduled for later
      const targetTab = instant ? 'sent' : 'scheduled';
      navigate(`/emails?tab=${targetTab}`);

      if (onScheduledSuccess) onScheduledSuccess();
      window.dispatchEvent(
        new CustomEvent('reachinbox-refresh-emails', {
          detail: { tab: targetTab, instant }
        })
      );
    } catch (err: any) {
      setFormError(`Scheduling error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fade-in font-sans">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-[#E5E7EB] overflow-hidden relative">
        {/* 1. Header matching Figma: "← Compose New Email" + Right Actions */}
        <div className="h-14 px-6 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-semibold text-[#111827] hover:text-[#00A36C] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Compose New Email</span>
          </button>

          {/* Right Action Icons & Send Later Button */}
          <div className="flex items-center gap-3 relative">
            <button
              type="button"
              title="Attach File"
              className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-full transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowSendLaterPopover(!showSendLaterPopover)}
              title="Schedule Options"
              className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-full transition-colors"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Figma Split Button: Send Later (Green) */}
            <div className="relative inline-flex items-center rounded-full bg-[#00A36C] text-white shadow-sm hover:bg-[#008f5d] transition-colors">
              <button
                type="button"
                onClick={() => setShowSendLaterPopover(!showSendLaterPopover)}
                className="px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <span>Send Later</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>

            {/* Send Later Popover - Exactly matching Figma bottom frame */}
            {showSendLaterPopover && (
              <div className="absolute top-12 right-0 w-64 bg-white rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] border border-[#E5E7EB] p-4 z-50 text-xs space-y-3">
                <div className="font-bold text-[#111827] text-sm">Send Later</div>

                <div className="space-y-1.5">
                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                    <span className="text-[#374151]">Pick date & time</span>
                    <input
                      type="radio"
                      name="preset"
                      checked={selectedPreset === 'custom'}
                      onChange={() => setSelectedPreset('custom')}
                      className="text-[#00A36C] focus:ring-[#00A36C]"
                    />
                  </label>

                  {selectedPreset === 'custom' && (
                    <input
                      type="datetime-local"
                      value={customDateTime}
                      onChange={(e) => setCustomDateTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[11px] bg-[#F9FAFB] text-[#111827]"
                    />
                  )}

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                    <span className="text-[#374151]">Tomorrow</span>
                    <input
                      type="radio"
                      name="preset"
                      checked={selectedPreset === 'tomorrow'}
                      onChange={() => setSelectedPreset('tomorrow')}
                      className="text-[#00A36C] focus:ring-[#00A36C]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                    <span className="text-[#374151]">Tomorrow, 10:00 AM</span>
                    <input
                      type="radio"
                      name="preset"
                      checked={selectedPreset === 'tomorrow-10am'}
                      onChange={() => setSelectedPreset('tomorrow-10am')}
                      className="text-[#00A36C] focus:ring-[#00A36C]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                    <span className="text-[#374151]">Tomorrow, 1:00 PM</span>
                    <input
                      type="radio"
                      name="preset"
                      checked={selectedPreset === 'tomorrow-1pm'}
                      onChange={() => setSelectedPreset('tomorrow-1pm')}
                      className="text-[#00A36C] focus:ring-[#00A36C]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer">
                    <span className="text-[#374151]">Tomorrow, 3:00 PM</span>
                    <input
                      type="radio"
                      name="preset"
                      checked={selectedPreset === 'tomorrow-3pm'}
                      onChange={() => setSelectedPreset('tomorrow-3pm')}
                      className="text-[#00A36C] focus:ring-[#00A36C]"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F3F4F6]">
                  <button
                    type="button"
                    onClick={() => setShowSendLaterPopover(false)}
                    className="px-3 py-1.5 text-xs text-[#6B7280] hover:text-[#111827]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleScheduleSubmit(false)}
                    className="px-4 py-1.5 rounded-full bg-[#00A36C] text-white font-semibold hover:bg-[#008f5d] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Scheduling...' : 'Done'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {formError && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between font-medium">
            <span>{formError}</span>
            <button
              type="button"
              onClick={() => setFormError(null)}
              className="text-rose-500 hover:text-rose-800 text-base leading-none font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* 2. Main Form Canvas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* From Line */}
          <div className="flex items-center gap-3 text-xs">
            <span className="w-12 text-[#9CA3AF] font-medium text-right shrink-0">From</span>
            <div className="px-3 py-1.5 rounded-full bg-[#F3F4F6] text-[#374151] font-medium inline-flex items-center gap-1.5 border border-[#E5E7EB]">
              <span>{fromEmail}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </div>
          </div>

          {/* To Line with Chips and 'Upload List' */}
          <div className="flex items-center gap-3 text-xs">
            <span className="w-12 text-[#9CA3AF] font-medium text-right shrink-0">To</span>
            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[38px] p-1.5 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] focus-within:bg-white focus-within:border-[#00A36C] transition-all">
              {recipients.slice(0, 4).map((r) => (
                <span
                  key={r.email}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-[#E8F5E9] text-[#00A36C] font-medium border border-[#A7F3D0]"
                >
                  <span>{r.email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(r.email)}
                    className="hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {recipients.length > 4 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#F3F4F6] text-[#6B7280] font-semibold">
                  +{recipients.length - 4}
                </span>
              )}

              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleAddRecipient}
                onBlur={commitRecipientInput}
                placeholder={recipients.length === 0 ? 'Type recipient email & press Enter...' : 'Add another email...'}
                className="flex-1 min-w-[140px] bg-transparent text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none px-2"
              />

              {recipientInput.trim().includes('@') && (
                <button
                  type="button"
                  onClick={commitRecipientInput}
                  className="px-2 py-0.5 rounded-full bg-[#00A36C] text-white text-[11px] font-semibold hover:bg-[#008f5d] transition-colors shrink-0"
                >
                  + Add
                </button>
              )}
            </div>

            {/* Upload List Action on the right */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D1D5DB] hover:border-[#00A36C] bg-white text-[#374151] hover:text-[#00A36C] text-xs font-semibold cursor-pointer transition-colors shrink-0 shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Upload List'}</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Detected count notification if uploaded */}
          {detectedMessage && (
            <div className="flex items-center gap-1.5 ml-15 text-[11px] font-semibold text-[#00A36C] bg-[#E8F5E9] py-1 px-3 rounded-lg border border-[#A7F3D0] w-fit">
              <Check className="w-3.5 h-3.5" />
              <span>{detectedMessage}</span>
            </div>
          )}

          {/* Subject Line */}
          <div className="flex items-center gap-3 text-xs">
            <span className="w-12 text-[#9CA3AF] font-medium text-right shrink-0">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 h-9 px-4 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#00A36C] focus:ring-1 focus:ring-[#00A36C]"
            />
          </div>

          {/* Delay & Hourly Limit Row - Matching Figma bottom center frame */}
          <div className="flex items-center gap-8 pl-15 py-1 text-xs text-[#4B5563]">
            <div className="flex items-center gap-2">
              <span>Delay between 2 emails:</span>
              <div className="inline-flex items-center border border-[#D1D5DB] rounded-lg bg-white px-2 py-1">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={delayBetweenEmails}
                  onChange={(e) => setDelayBetweenEmails(e.target.value)}
                  className="w-8 text-center text-xs font-mono font-bold text-[#111827] focus:outline-none"
                />
                <span className="text-[11px] text-[#9CA3AF] ml-1">sec</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span>Hourly Limit:</span>
              <div className="inline-flex items-center border border-[#D1D5DB] rounded-lg bg-white px-2 py-1">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(e.target.value)}
                  className="w-10 text-center text-xs font-mono font-bold text-[#111827] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Rich Text Toolbar - Exactly matching Figma editor bar */}
          <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">
            <div className="h-10 bg-[#FAFAFA] border-b border-[#E5E7EB] px-3 flex items-center gap-1 overflow-x-auto text-[#6B7280]">
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Undo">
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Redo">
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-[#E5E7EB] mx-1" />
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white text-xs font-serif font-bold">
                T
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white text-xs font-bold">
                Tt
              </button>
              <div className="h-4 w-[1px] bg-[#E5E7EB] mx-1" />
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Bold">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Italic">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Underline">
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Strikethrough">
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-[#E5E7EB] mx-1" />
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Align">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Bullet List">
                <List className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Numbered List">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-[1px] bg-[#E5E7EB] mx-1" />
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Quote">
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Code">
                <Code className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Insert Link">
                <Link2 className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1.5 hover:text-[#111827] rounded hover:bg-white" title="Insert Image">
                <Image className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Textarea: "Type Your Reply..." */}
            <textarea
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type Your Reply..."
              className="w-full p-5 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-14 px-6 border-t border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#6B7280]">
            {recipients.length} recipients selected • BullMQ Persistent Queue
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
            >
              Discard
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleScheduleSubmit(true)}
              className="px-5 py-2 rounded-full bg-[#00A36C] hover:bg-[#008f5d] text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Dispatching...' : 'Send Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
