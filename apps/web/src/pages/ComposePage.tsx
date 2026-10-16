import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Gauge,
  Send,
  Users,
  Sparkles,
  Info
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { RecipientItem } from '@reachinbox/shared';

export const ComposePage: React.FC = () => {
  const navigate = useNavigate();

  // Campaign Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(
    'Hi {{name}},\n\nI hope this email finds you well. I wanted to reach out regarding our automated email scheduler assignment for ReachInbox.\n\nBest regards,\nReachInbox Team'
  );

  // Default start time: Now + 2 minutes
  const getInitialStartTime = () => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [startTime, setStartTime] = useState(getInitialStartTime());
  const [minDelayMs, setMinDelayMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  // Recipient Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [invalidRows, setInvalidRows] = useState<{ raw: string; reason: string }[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle CSV/TXT parsing via backend API
  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const result = await apiRequest<{
        validCount: number;
        duplicateCount: number;
        invalidCount: number;
        preview: RecipientItem[];
        invalidRows: { raw: string; reason: string }[];
      }>('/campaigns/parse-recipients', {
        method: 'POST',
        body: formData
      });

      setRecipients(result.preview);
      setInvalidRows(result.invalidRows);
      setDuplicateCount(result.duplicateCount);

      if (result.validCount === 0) {
        setUploadError('No valid recipient email addresses found in file.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse recipients file');
      setRecipients([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Add sample demo recipients
  const handleAddSampleRecipients = () => {
    const samples: RecipientItem[] = [
      { email: 'alex.rivera@example.com', name: 'Alex Rivera' },
      { email: 'sarah.chen@techcorp.io', name: 'Sarah Chen' },
      { email: 'marcus.vance@startup.dev', name: 'Marcus Vance' },
      { email: 'elena.rostova@outreach.net', name: 'Elena Rostova' },
      { email: 'david.kim@innovate.co', name: 'David Kim' }
    ];
    setRecipients(samples);
    setDuplicateCount(0);
    setInvalidRows([]);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recipients.length === 0) {
      alert('Please upload a recipient CSV or add sample recipients before scheduling.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload = {
        name: name || `Outreach Campaign #${new Date().toLocaleDateString()}`,
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        minDelayMs: Number(minDelayMs),
        hourlyLimit: Number(hourlyLimit),
        idempotencyKey,
        recipients
      };

      const res = await apiRequest<{ message: string; scheduledCount: number }>('/campaigns', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSubmitSuccess(res.message);
      setTimeout(() => {
        navigate('/emails');
      }, 1500);
    } catch (err: any) {
      setSubmitError(err.message || 'Scheduling failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Compose & Schedule Campaign</h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure outreach content, upload target list, and tune distributed delay & rate limits.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Campaign Metadata & Content */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-semibold text-white">1. Message Configuration</h3>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Campaign Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Enterprise Outreach Batch"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick question regarding your outbound infrastructure"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">Email Body Template</label>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span>Variables:</span>
                <span className="font-mono text-primary-300 bg-primary-500/10 px-1.5 py-0.5 rounded border border-primary-500/20">
                  {`{{name}}`}
                </span>
              </div>
            </div>
            <textarea
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-sans placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Step 2: Recipients List & CSV Upload */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-sm font-semibold text-white">2. Recipient List & Validation</h3>
            </div>
            <button
              type="button"
              onClick={handleAddSampleRecipients}
              className="text-xs text-primary-400 hover:text-primary-300 font-medium underline"
            >
              + Load 5 Sample Contacts
            </button>
          </div>

          {/* Drag & Drop Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-700/80 hover:border-primary-500/60 rounded-2xl p-6 text-center transition-colors cursor-pointer bg-slate-900/40 relative"
          >
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-primary-400" />
              </div>
              <p className="text-xs font-semibold text-slate-200">
                {file ? file.name : 'Drop your recipient CSV or TXT file here, or click to browse'}
              </p>
              <p className="text-[11px] text-slate-400">
                Supports column header `email` or single email per line (auto-deduplicated).
              </p>
            </div>
          </div>

          {/* Validation & Parsing Feedback */}
          {isParsing && (
            <div className="p-3 rounded-xl bg-slate-900 text-xs text-primary-300 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              <span>Validating and deduplicating addresses on backend...</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Recipient Count & Preview */}
          {recipients.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{recipients.length} Valid Recipients Scheduled</span>
                </div>
                {duplicateCount > 0 && (
                  <span className="text-amber-400 text-[11px]">
                    ({duplicateCount} duplicates safely filtered out)
                  </span>
                )}
              </div>

              {/* Mini Preview Table */}
              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Recipient Email</th>
                      <th className="py-2 px-3">Name</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recipients.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{i + 1}</td>
                        <td className="py-2 px-3 text-slate-200 font-medium">{r.email}</td>
                        <td className="py-2 px-3 text-slate-400">{r.name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Timing, Delays & Hourly Quotas */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">3. Queue Scheduling & Rate Limiting</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Start Time */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-400" />
                <span>Start Date & Time</span>
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Minimum Delay */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Min Inter-Send Delay (ms)</span>
              </label>
              <input
                type="number"
                required
                min={500}
                step={500}
                value={minDelayMs}
                onChange={(e) => setMinDelayMs(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                {(minDelayMs / 1000).toFixed(1)}s interval between sends
              </span>
            </div>

            {/* Hourly Quota */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Hourly Limit (emails/hr)</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={5000}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Defers to next window when exceeded
              </span>
            </div>
          </div>

          {/* Idempotency Protection Indicator */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-400 shrink-0" />
              <span>Idempotency Key: <span className="font-mono text-slate-300">{idempotencyKey}</span></span>
            </div>
            <button
              type="button"
              onClick={() => setIdempotencyKey(`key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)}
              className="text-[11px] text-primary-400 hover:text-primary-300 font-medium underline"
            >
              Regenerate
            </button>
          </div>
        </div>

        {/* Submission Feedback */}
        {submitError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{submitSuccess} Redirecting to queue...</span>
          </div>
        )}

        {/* Schedule Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || recipients.length === 0}
            className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-600 shadow-lg shadow-primary-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Enqueueing in BullMQ...' : `Schedule ${recipients.length} Emails`}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
