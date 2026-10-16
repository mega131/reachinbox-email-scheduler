import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Inbox,
  Clock,
  Send,
  Plus,
  Slack,
  Activity,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  onOpenCompose?: () => void;
  counts?: {
    inbox: number;
    scheduled: number;
    sent: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenCompose, counts }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleComposeClick = () => {
    if (onOpenCompose) {
      onOpenCompose();
    } else {
      navigate('/compose');
    }
  };

  const displayName = user?.name || 'Oliver Brown';
  const displayEmail = user?.email || 'oliver.brown@domain.io';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'OB';

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 h-screen sticky top-0 font-sans">
      {/* 1. Brand Logo */}
      <div className="pt-6 px-6 pb-4">
        <div className="text-2xl font-black tracking-tighter text-[#111827]">
          ONE<span className="text-[#00A36C]">.</span>
        </div>
      </div>

      {/* 2. User Profile Card */}
      <div className="px-6 py-2 flex items-center gap-3">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover border border-[#E5E7EB] shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#00A36C] text-white font-semibold flex items-center justify-center text-sm shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#111827] truncate leading-tight">
            {displayName}
          </div>
          <div className="text-xs text-[#6B7280] truncate leading-tight mt-0.5">
            {displayEmail}
          </div>
        </div>
      </div>

      {/* 3. Prominent '+ Compose' Button */}
      <div className="px-6 py-4">
        <button
          onClick={handleComposeClick}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-full border border-[#D1D5DB] hover:border-[#00A36C] bg-white hover:bg-[#F9FAFB] text-sm font-semibold text-[#111827] transition-all shadow-sm active:scale-[0.99] group"
        >
          <Plus className="w-4 h-4 text-[#00A36C] group-hover:scale-110 transition-transform" />
          <span>Compose</span>
        </button>
      </div>

      {/* 4. Core Navigation Items with Counter Badges */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Core
        </div>

        {/* Inbox / All Records */}
        <NavLink
          to="/emails?tab=all"
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
              isActive
                ? 'bg-[#E8F5E9] text-[#00A36C] font-semibold'
                : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <Inbox className="w-4 h-4" />
            <span>Inbox</span>
          </div>
          <span className="text-xs font-mono font-medium text-[#6B7280]">
            {counts?.inbox ?? 12}
          </span>
        </NavLink>

        {/* Scheduled Queue */}
        <NavLink
          to="/emails?tab=scheduled"
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
              isActive
                ? 'bg-[#E8F5E9] text-[#00A36C] font-semibold'
                : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4" />
            <span>Scheduled</span>
          </div>
          <span className="text-xs font-mono font-medium text-[#6B7280]">
            {counts?.scheduled ?? 3}
          </span>
        </NavLink>

        {/* Sent / Delivered */}
        <NavLink
          to="/emails?tab=sent"
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
              isActive
                ? 'bg-[#E8F5E9] text-[#00A36C] font-semibold'
                : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
            }`
          }
        >
          <div className="flex items-center gap-3">
            <Send className="w-4 h-4" />
            <span>Sent</span>
          </div>
          <span className="text-xs font-mono font-medium text-[#6B7280]">
            {counts?.sent ?? 365}
          </span>
        </NavLink>

        {/* Secondary Integrations */}
        <div className="pt-4 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Settings & Telemetry
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
              isActive
                ? 'bg-[#E8F5E9] text-[#00A36C] font-semibold'
                : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
            }`
          }
        >
          <Slack className="w-4 h-4 text-[#E01E5A]" />
          <span>Slack & Limits</span>
        </NavLink>

        <a
          href="/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-[#00A36C]" />
            <span>Bull Board Monitor</span>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E8F5E9] text-[#00A36C]">
            Live
          </span>
        </a>
      </nav>

      {/* Footer with Logout */}
      <div className="p-4 border-t border-[#E5E7EB]">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
