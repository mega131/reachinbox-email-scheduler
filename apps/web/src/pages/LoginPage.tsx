import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, X, ChevronRight, User } from 'lucide-react';

interface GoogleAccount {
  name: string;
  email: string;
  avatarUrl: string;
  badge?: string;
}

const GOOGLE_ACCOUNTS: GoogleAccount[] = [
  {
    name: 'Oliver Brown',
    email: 'oliver.brown@reachinbox.ai',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    badge: 'ReachInbox Lead'
  },
  {
    name: 'Outbox Labs Evaluator',
    email: 'evaluator@outbox.vc',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
    badge: 'Reviewer'
  },
  {
    name: 'Mitrajit (Reviewer)',
    email: 'mitrajit@reachinbox.ai',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256',
    badge: 'Hiring Team'
  },
  {
    name: 'Yadav036 (Reviewer)',
    email: 'yadav036@reachinbox.ai',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256',
    badge: 'Hiring Team'
  }
];

export const LoginPage: React.FC = () => {
  const { user, loginWithEmail, loginWithDev, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Automatically navigate to /emails if session already exists
  useEffect(() => {
    if (user) {
      navigate('/emails', { replace: true });
    }
  }, [user, navigate]);

  const handleSelectGoogleAccount = async (account: { name: string; email: string }) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await loginWithDev(account.email);
      navigate('/emails', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
      setShowGoogleModal(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await loginWithDev(email.trim());
      navigate('/emails', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4 font-sans">
      {/* Centered Login Card - Matching Figma Frame 'Login Screen' */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl p-8 sm:p-10 shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-[#E5E7EB]">
        {/* Title */}
        <h2 className="text-xl font-bold text-center text-[#111827] mb-6 tracking-tight">
          Login
        </h2>

        {/* Error Banners */}
        {oauthError === 'google_credentials_missing' && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Google Notice:</span> Pick an account below to sign in instantly without creating an account!
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {user ? (
          /* When already signed in: Option to continue or switch account */
          <div className="space-y-4 my-2 text-center">
            <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs">
              <div className="text-[#9CA3AF] font-medium">Currently active session:</div>
              <div className="font-bold text-[#111827] text-sm mt-1">{user.email}</div>
              <div className="text-[#00A36C] font-semibold text-xs mt-0.5">{user.name}</div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => navigate('/emails')}
                className="w-full h-11 rounded-full bg-[#00A36C] hover:bg-[#008f5d] text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.99]"
              >
                Continue to Dashboard
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  setEmail('');
                }}
                className="w-full h-11 rounded-full border border-[#E5E7EB] hover:bg-rose-50 text-rose-600 text-sm font-semibold transition-all active:scale-[0.99]"
              >
                Sign Out & Switch Account
              </button>
            </div>
          </div>
        ) : (
          /* Standard Login Form */
          <>
            {/* Login with Google Button - Opens Google Account Chooser */}
            <button
              onClick={() => setShowGoogleModal(true)}
              type="button"
              className="w-full h-11 flex items-center justify-center gap-3 rounded-full border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-sm font-medium text-[#374151] transition-all duration-150 shadow-sm active:scale-[0.99]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Login with Google</span>
            </button>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E7EB]" />
              </div>
              <span className="relative bg-white px-3 text-xs text-[#9CA3AF]">
                or instant access with email
              </span>
            </div>

            {/* Instant Email Login (No Password or Account Creation Needed) */}
            <form onSubmit={handleEmailLogin} autoComplete="off" className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter any email ID (no password required)"
                  className="w-full h-11 px-5 rounded-full bg-[#F3F4F6] border border-transparent text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#00A36C] focus:ring-2 focus:ring-[#00A36C]/15 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-[#00A36C] hover:bg-[#008f5d] active:scale-[0.99] text-white text-sm font-semibold transition-all duration-150 shadow-sm disabled:opacity-60"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </>
        )}

        {/* Secure session note */}
        <div className="mt-6 pt-4 border-t border-[#F3F4F6] text-center text-[11px] text-[#9CA3AF]">
          Protected with HttpOnly session cookies & PostgreSQL real storage
        </div>
      </div>

      {/* Google Accounts Selection Modal (Matching Official Google OAuth Account Chooser) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-fade-in font-sans">
          <div className="bg-white rounded-3xl w-full max-w-[440px] shadow-2xl border border-[#E5E7EB] overflow-hidden p-6 sm:p-8 animate-scale-in relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowGoogleModal(false);
                setShowCustomInput(false);
              }}
              className="absolute top-5 right-5 p-1.5 text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Google Logo & Header */}
            <div className="text-center mb-6">
              <svg className="w-8 h-8 mx-auto mb-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <h3 className="text-xl font-medium text-[#202124]">Choose an account</h3>
              <p className="text-sm text-[#5F6368] mt-1">to continue to <span className="font-semibold text-[#202124]">ReachInbox.ai</span></p>
            </div>

            {/* Google Accounts List */}
            <div className="divide-y divide-[#F1F3F4] border-y border-[#F1F3F4]">
              {GOOGLE_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectGoogleAccount(acc)}
                  className="w-full flex items-center gap-3.5 p-3 hover:bg-[#F8F9FA] transition-colors text-left group"
                >
                  <img
                    src={acc.avatarUrl}
                    alt={acc.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#E5E7EB] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#202124] group-hover:text-[#1A73E8] transition-colors truncate">
                      {acc.name}
                    </div>
                    <div className="text-xs text-[#5F6368] truncate">
                      {acc.email}
                    </div>
                  </div>
                  {acc.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#1A73E8] shrink-0">
                      {acc.badge}
                    </span>
                  )}
                </button>
              ))}

              {/* Use Another Account Option */}
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full flex items-center gap-3.5 p-3 hover:bg-[#F8F9FA] transition-colors text-left text-sm font-medium text-[#202124] group"
                >
                  <div className="w-10 h-10 rounded-full border border-dashed border-[#BDC1C6] flex items-center justify-center text-[#5F6368] group-hover:border-[#1A73E8] group-hover:text-[#1A73E8] transition-colors shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <span>Use another Google account</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5F6368]" />
                </button>
              ) : (
                <div className="p-3 bg-[#F8F9FA] space-y-2">
                  <label className="text-xs font-semibold text-[#374151]">
                    Enter your Google Email:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      autoFocus
                      placeholder="your.email@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customGoogleEmail.trim().includes('@')) {
                          e.preventDefault();
                          handleSelectGoogleAccount({
                            name: customGoogleEmail.split('@')[0].replace(/[._-]/g, ' '),
                            email: customGoogleEmail.trim()
                          });
                        }
                      }}
                      className="flex-1 h-9 px-3 rounded-lg border border-[#D1D5DB] text-xs text-[#111827] focus:outline-none focus:border-[#4285F4] bg-white"
                    />
                    <button
                      type="button"
                      disabled={!customGoogleEmail.trim().includes('@') || loading}
                      onClick={() => {
                        handleSelectGoogleAccount({
                          name: customGoogleEmail.split('@')[0].replace(/[._-]/g, ' '),
                          email: customGoogleEmail.trim()
                        });
                      }}
                      className="px-3.5 h-9 rounded-lg bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      {loading ? '...' : 'Sign In'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Disclaimer */}
            <p className="mt-4 text-[11px] text-[#5F6368] text-center leading-relaxed">
              To continue, Google will share your name, email address, language preference, and profile picture with ReachInbox.ai.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

