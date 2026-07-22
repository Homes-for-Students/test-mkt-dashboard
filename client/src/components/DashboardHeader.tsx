import React, { useState } from 'react';
import {
  Calendar,
  Building2,
  Database,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Share,
  RefreshCw,
  Menu
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import PropertyMultiSelect from './PropertyMultiSelect';
import ShareDashboardModal from './ShareDashboardModal';
import { DateRangePicker } from './DateRangePicker';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc';

import PresetBadge from './PresetBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface DashboardHeaderProps {
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  dateRange: { from: Date; to: Date };
  selectedPropertyIds?: string[];
  onPropertySelectionChange?: (ids: string[]) => void;
  selectedCity?: string;
  activeTab?: string;
  onLoadPreset?: (properties: string[], period: string, city: string) => void;
  activePresetName?: string | null;
  onClearPreset?: () => void;
  isShared?: boolean;
  selectedBrand?: string;
  onBrandChange?: (brand: string) => void;
  clientName?: string | null;
  /** Mobile: callback to open the sidebar drawer */
  onMenuToggle?: () => void;
}

export default function DashboardHeader({
  onDateRangeChange,
  dateRange,
  selectedPropertyIds = [],
  onPropertySelectionChange,
  selectedCity = 'All',
  activeTab = 'overview',
  activePresetName = null,
  onClearPreset,
  isShared = false,
  selectedBrand = 'All Brands',
  onBrandChange,
  clientName,
  onMenuToggle,
}: DashboardHeaderProps) {
  const [syncTime, setSyncTime] = useState('Just now');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const queryClient = useQueryClient();
  const clearCacheMutation = trpc.analytics.clearCache.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      setSyncTime('Just now');
    }
  });

  const { data: PROPERTIES = [] } = trpc.properties.getAll.useQuery();
  const { data: brandColors = {} } = trpc.brandColors.getAll.useQuery();

  const { isLoading: isLoadingAnalytics } = trpc.analytics.getChannelBreakdown.useQuery({
    selectedCity,
    selectedPropertyIds,
    selectedBrand,
    dateRange: {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd')
    }
  });

  const currentBrandConfig = Object.values(brandColors).find(c => c.brand === selectedBrand);
  const displayBrandName = currentBrandConfig?.fullName || selectedBrand;

  // Calculate active brands dynamically from the actual property data, NOT from the settings table
  const activeBrands = Array.from(new Set(PROPERTIES.map(p => p.brand))).sort((a, b) => a.localeCompare(b));
  const brandsList = ['All Brands', ...activeBrands];

  return (
    <header className="sticky top-0 z-40 flex flex-row min-h-[4rem] h-auto w-full items-center justify-between gap-3 border-b border-slate-100 bg-white/70 px-4 sm:px-6 py-0 backdrop-blur-xl transition-all">
      {/* Left Section: Hamburger (mobile) + Branding + Client Switcher */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Hamburger — mobile only, only for internal dashboard */}
        {!isShared && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <img src="/logo.png" alt="Logo" className="h-6 sm:h-8 w-auto object-contain rounded-sm shrink-0" />
          <div className="flex flex-col min-w-0 overflow-hidden">
            <h1 className="hidden md:block text-sm font-semibold tracking-tight text-slate-900 truncate">
              {isShared && clientName ? `${clientName}` : (isShared && selectedBrand && selectedBrand !== 'All Brands' ? displayBrandName : 'HFS Central Marketing')}
            </h1>
            <span className="hidden lg:block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Digital Marketing Report Hub</span>
          </div>
        </div>

        <div className="hidden md:block h-6 w-[1px] bg-slate-100" />

        {/* Active Preset Badge */}
        {activePresetName && (
          <>
            <PresetBadge
              presetName={activePresetName}
              onClear={() => onClearPreset?.()}
            />
            <div className="hidden sm:block h-6 w-[1px] bg-slate-100" />
          </>
        )}

        {/* Client Switcher (hidden on mobile + tablet, shown lg+) */}
        {!isShared && (
          <div className="hidden lg:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
                <span className="font-semibold text-slate-800">{displayBrandName}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-xl border-slate-100 p-1.5 max-h-64 overflow-y-auto">
              {brandsList.map((brand) => {
                const config = Object.values(brandColors).find(c => c.brand === brand);
                const label = config?.fullName || brand;
                return (
                  <DropdownMenuItem
                    key={brand}
                    onClick={() => {
                      onBrandChange?.(brand);
                      toast.success(`Switched to ${label}`);
                    }}
                    className={`rounded-lg text-xs ${selectedBrand === brand ? 'bg-slate-50 font-medium text-blue-600' : ''}`}
                  >
                    {label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        )}
      </div>

      {/* Right Section: Time period selector, Sync Status, Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Sync Status Badge */}
        {!isShared && (
          <div className="hidden xl:flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-100/80 px-3 py-1 text-[11px] text-slate-500">
            <Database className={`h-3.5 w-3.5 ${isLoadingAnalytics ? 'text-slate-400 animate-pulse' : 'text-blue-500'}`} />
            <span className="font-semibold text-slate-700">{isLoadingAnalytics ? 'Syncing APIs...' : 'Integrations Live'}</span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              {isLoadingAnalytics ? (
                <div className="animate-spin h-3 w-3 border-2 border-slate-300 border-t-slate-500 rounded-full" />
              ) : (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              )}
              {isLoadingAnalytics ? 'Fetching...' : `Synced ${syncTime}`}
            </span>
          </div>
        )}

        {/* Time Period Dropdown / Badge */}
        {isShared ? (
          <div className="flex items-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-1.5 sm:px-3 rounded-xl border border-slate-100 text-xs font-medium text-slate-600 bg-slate-50/50 shadow-xs whitespace-nowrap min-w-0 shrink">
            <Calendar className="hidden sm:block h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="hidden sm:inline">
              {dateRange.from && dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()
                ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
                : dateRange.from ? format(dateRange.from, 'MMM dd, yyyy') : 'No dates selected'}
            </span>
            <span className="sm:hidden inline text-[11px]">
              {dateRange.from && dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime()
                ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d')}`
                : dateRange.from ? format(dateRange.from, 'MMM d') : 'Dates'}
            </span>
          </div>
        ) : (
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        )}


        {/* Share Button */}
        {!isShared && (
          <Button
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            className="h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-md shadow-blue-500/10 border-0 px-2 sm:px-4"
          >
            <Share className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}

        {/* Hard Refresh Button */}
        {!isShared && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              toast.promise(clearCacheMutation.mutateAsync(), {
                loading: 'Clearing cache and refreshing...',
                success: 'Cache cleared and data refreshed!',
                error: 'Failed to clear cache'
              });
            }}
            disabled={clearCacheMutation.isPending || isLoadingAnalytics}
            className="h-9 px-3 rounded-md text-slate-600 border-slate-200 hover:bg-slate-50"
            title="Hard Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${clearCacheMutation.isPending || isLoadingAnalytics ? 'animate-spin text-blue-500' : ''}`} />
          </Button>
        )}
      </div>

      {/* Share Modal */}
      {!isShared && (
        <ShareDashboardModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          selectedPropertyIds={selectedPropertyIds}
          selectedBrand={selectedBrand}
          dashboardView={activeTab}
          dateRange={dateRange}
        />
      )}
    </header>
  );
}
