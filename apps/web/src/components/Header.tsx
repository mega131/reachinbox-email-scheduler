import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, Slack, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery = '',
  onSearchChange,
  onRefresh
}) => {
  const { user, logout } = useAuth();
  const [slackConnected, setSlackConnected] = useState<boolean | null>(null);

  useEffect(() => {
    apiRequest<{ connected: boolean }>('/slack/status')
      .then((data) => setSlackConnected(data.connected))
      .catch(() => setSlackConnected(false));
  }, []);

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] px-8 flex items-center justify-between sticky top-0 z-20">
      {/* 1. Global Search Pill - Matches Figma Top Bar */}
      <div className="relative w-96">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          placeholder="Search"
          className="w-full h-10 pl-10 pr-4 rounded-full bg-[#F3F4F6] border border-transparent text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#00A36C] focus:ring-2 focus:ring-[#00A36C]/15 transition-all"
        />
        <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {/* 2. Right Side Status and Refresh */}
      <div className="flex items-center gap-3">
        {/* Slack Connection Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#F9FAFB] border border-[#E5E7EB]">
          <Slack className="w-3.5 h-3.5 text-[#E01E5A]" />
          <span className="text-[#6B7280]">Slack Alert:</span>
          {slackConnected === null ? (
            <span className="text-[#9CA3AF]">Checking...</span>
          ) : slackConnected ? (
            <span className="flex items-center gap-1 text-[#00A36C] font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Armed
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[#F59E0B] font-semibold">
              <AlertCircle className="w-3 h-3" /> Offline
            </span>
          )}
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh List"
            className="p-2 rounded-full text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors border border-[#E5E7EB]"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* User Info & Logout in Top Header as specified in requirements */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-[#E5E7EB]">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border border-[#E5E7EB]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#00A36C] text-white font-semibold flex items-center justify-center text-xs">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-[#111827] leading-none">
              {user?.name || 'Oliver Brown'}
            </div>
            <div className="text-[10px] text-[#6B7280] leading-tight mt-0.5">
              {user?.email || 'oliver.brown@domain.io'}
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
