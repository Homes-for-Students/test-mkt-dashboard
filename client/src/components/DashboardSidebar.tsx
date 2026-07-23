import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  MapPin,
  HelpCircle,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Building,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Search,
  Link as LinkIcon,
  X
} from 'lucide-react';
import { INTEGRATION_STATUS } from '@/lib/mockData';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { trpc } from "@/lib/trpc";

interface DashboardSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  cities: string[];
  isShared?: boolean;
  isLoadingAnalytics?: boolean;
  /** Mobile drawer: whether the drawer is open */
  isMobileOpen?: boolean;
  /** Mobile drawer: callback to close the drawer */
  onMobileClose?: () => void;
}

export default function DashboardSidebar({
  activeTab,
  setActiveTab,
  selectedCity,
  setSelectedCity,
  cities,
  isShared = false,
  isLoadingAnalytics = false,
  isMobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps) {
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(true);
  const { data: user } = trpc.auth.getMe.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      }
    });
  };

  const hasIntegrationError = INTEGRATION_STATUS.some(s => s.status !== 'Connected');

  // Collapsible state persisted in localStorage (desktop only)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pbsa_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('pbsa_sidebar_collapsed', JSON.stringify(nextState));
    } catch (e) {
      console.error('Failed to save sidebar collapsed state', e);
    }
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    onMobileClose?.();
  };

  const menuItems = [
    { id: 'overview', label: 'Portfolio overview', icon: LayoutDashboard },
    { id: 'campaigns', label: 'Search performance', icon: Search },
    { id: 'ga4', label: 'Website performance', icon: BarChart3 },
    ...(!isShared && user?.role !== 'viewer' ? [{ id: 'shared-links', label: 'Shared links', icon: LinkIcon }] : []),
    { id: 'divider-settings', label: 'Settings', type: 'divider' },
    ...(user?.role !== 'viewer' ? [{ id: 'properties', label: 'Property management', icon: Building }] : []),
  ];

  const navContent = (collapsed: boolean) => (
    <>
      {/* Navigation Section */}
      <div className="p-4 pb-2">
        <div className={`flex items-center mb-2 px-1 ${collapsed ? 'justify-center' : 'px-3'}`}>
          {!collapsed && (
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Hub
            </span>
          )}
        </div>

        <nav className="mt-1 space-y-1">
          {menuItems.map((item) => {
            if (item.type === 'divider') {
              if (collapsed) return <div key={item.id} className="my-2 mx-2 border-t border-slate-200/50" />;
              return (
                <div key={item.id} className="mt-4 mb-2 px-3">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
              );
            }

            const Icon = item.icon!;
            const isActive = activeTab === item.id;

            const buttonContent = (
              <button
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-all duration-200 ${collapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
                  } ${isActive
                    ? 'bg-white text-blue-600 shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-slate-100'
                    : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                  }`}
              >
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
                  <div className={`transition-colors shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                    <Icon className="h-4 w-4 shrink-0" />
                  </div>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
              </button>
            );

            if (collapsed) {
              return (
                <TooltipProvider key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {buttonContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs font-medium">{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return <React.Fragment key={item.id}>{buttonContent}</React.Fragment>;
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="mt-auto flex flex-col">
        {/* Toggle Button (desktop only) */}
        <div className="px-2 mb-10 hidden lg:block">
          <button
            onClick={toggleCollapse}
            className={`w-full flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 ${collapsed ? 'justify-center p-2' : 'justify-start px-3 py-2.5 gap-2.5'}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
            {!collapsed && <span className="truncate">Close sidebar</span>}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile drawer overlay ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/10"
            onClick={onMobileClose}
          />

          {/* Drawer panel */}
          <aside className="absolute left-0 top-0 h-full w-72 flex flex-col border-r border-slate-100 bg-white shadow-2xl overflow-y-auto overflow-x-hidden select-none animate-in slide-in-from-left duration-200">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Navigation</span>
              <button
                onClick={onMobileClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navContent(false)}
          </aside>
        </div>
      )}

      {/* ── Desktop persistent sidebar ── */}
      <aside className={`hidden lg:flex flex-col border-r border-slate-100 bg-slate-50/50 h-full overflow-y-auto overflow-x-hidden select-none transition-all duration-300 shrink-0 ${isCollapsed ? 'w-16' : 'w-64'}`}>
        {navContent(isCollapsed)}
      </aside>
    </>
  );
}
