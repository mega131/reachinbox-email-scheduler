import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, loginWithEmail, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await loginWithEmail(email, password);
      navigate('/emails');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4">
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
              <span className="font-bold">Google OAuth Notice:</span> GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET are not configured in your <code>.env</code> file. You can log in with any real email address below to access your account immediately!
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
                  setPassword('');
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
            {/* Login with Google Button */}
            <button
              onClick={handleGoogleLogin}
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
                or sign in with email
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailLogin} autoComplete="off" className="space-y-4">
              <div>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email ID"
                  className="w-full h-11 px-5 rounded-full bg-[#F3F4F6] border border-transparent text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#00A36C] focus:ring-2 focus:ring-[#00A36C]/15 transition-all"
                />
              </div>

              <div>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-11 px-5 rounded-full bg-[#F3F4F6] border border-transparent text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#00A36C] focus:ring-2 focus:ring-[#00A36C]/15 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-[#00A36C] hover:bg-[#008f5d] active:scale-[0.99] text-white text-sm font-semibold transition-all duration-150 shadow-sm disabled:opacity-60 mt-2"
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
    </div>
  );
};
