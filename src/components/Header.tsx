import React from 'react';
import { KartavyaLogo } from './KartavyaLogo';
import {
  Sparkles,
  Database,
  Shield,
  Users,
  BarChart3,
  PlusCircle,
  Calendar,
  User,
  Building2,
  LogOut,
} from 'lucide-react';
import { AccountRole, AuthAccount } from '../types/civic';

export type ActiveTab =
  | 'feed'
  | 'detail'
  | 'events'
  | 'event-detail'
  | 'rag'
  | 'ingestion'
  | 'stakeholders'
  | 'collabs'
  | 'dashboard'
  | 'home'
  | 'explore'
  | 'volunteer'
  | 'insights'
  | 'organizations';

interface HeaderProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onOpenReportModal: () => void;
  scrapingInProgress?: boolean;
  currentAccount?: AuthAccount | null;
  onOpenAuthModal?: (role: AccountRole) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  onOpenReportModal,
  scrapingInProgress = false,
  currentAccount = null,
  onOpenAuthModal,
  onLogout,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'feed', label: 'Civic Discovery Feed', icon: Sparkles },
    { id: 'events', label: 'Civic Events & Volunteer', icon: Calendar },
    { id: 'rag', label: 'AI Civic Search', icon: Sparkles },
    { id: 'ingestion', label: 'Data Ingestion & Telemetry', icon: Database },
    { id: 'stakeholders', label: 'Stakeholders', icon: Shield },
    { id: 'collabs', label: 'Community Action', icon: Users },
    { id: 'dashboard', label: 'Dashboard & Metrics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#047857]/20 shadow-xs">
      {/* Top Notice Banner */}
      <div className="bg-[#047857] text-white text-[11px] py-1 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold px-1.5 py-0.2 bg-white/20 rounded-xs text-[10px] tracking-wider uppercase">
            Dual Government Sources
          </span>
          <span className="truncate">
            OpenCity India (Praja May 2025 Audit) • CPCB via OGD Platform (Real Time Air Quality Index)
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-white/90">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            93 Pages + 12 CAAQMS Stations
          </span>
          {scrapingInProgress && (
            <span className="bg-amber-500 text-white px-1.5 py-0.2 rounded-xs font-semibold animate-pulse">
              Ingesting...
            </span>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Lockup */}
          <button
            onClick={() => onNavigate('feed')}
            className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer focus:outline-hidden"
          >
            <KartavyaLogo size={34} showText={true} />
          </button>

          {/* Navigation items */}
          <nav className="hidden xl:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id || (item.id === 'feed' && activeTab === 'detail');
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#047857] text-white shadow-xs'
                      : 'text-[#047857] hover:bg-[#047857]/8'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Bar: Separate Citizen & NGO Login + Report Issue */}
          <div className="flex items-center gap-2 shrink-0">
            {currentAccount ? (
              <div className="flex items-center gap-2 bg-[#f4f7f5] border border-[#047857]/20 px-2.5 py-1.5 rounded-xs text-xs">
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-xs text-white ${
                    currentAccount.role === 'ngo' ? 'bg-[#F97316]' : 'bg-[#047857]'
                  }`}
                >
                  {currentAccount.role === 'ngo' ? 'NGO Partner' : 'Citizen'}
                </span>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="font-bold text-[#047857] text-[11px] truncate max-w-[130px]">
                    {currentAccount.role === 'ngo'
                      ? currentAccount.organization_name || currentAccount.name
                      : currentAccount.name}
                  </div>
                  <div className="text-[10px] text-[#047857]/70 truncate max-w-[130px]">
                    {currentAccount.email}
                  </div>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Sign Out"
                    className="p-1 text-[#047857]/70 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              onOpenAuthModal && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('user')}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#f4f7f5] text-[#047857] border border-[#047857]/30 text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Sign in or Register as a Citizen / Volunteer"
                  >
                    <User className="w-3.5 h-3.5 text-[#047857]" />
                    <span>Citizen Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('ngo')}
                    className="px-2.5 py-1.5 bg-[#047857] hover:bg-[#035f44] text-white text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Sign in or Register as an NGO / Civic Organization Partner"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-300" />
                    <span>NGO Login</span>
                  </button>
                </div>
              )
            )}

            <button
              onClick={onOpenReportModal}
              className="px-3 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Citizen Report (Secondary Feature)"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Report Issue</span>
            </button>
          </div>
        </div>

        {/* Tablet/Mobile Navigation bar */}
        <div className="xl:hidden flex items-center justify-start gap-1 py-2 overflow-x-auto border-t border-[#047857]/10 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id || (item.id === 'feed' && activeTab === 'detail');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-xs whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#047857] text-white'
                    : 'text-[#047857] hover:bg-[#047857]/5'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;
