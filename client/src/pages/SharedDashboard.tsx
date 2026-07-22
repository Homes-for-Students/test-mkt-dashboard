import React, { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRoute } from 'wouter';
import { Loader2, AlertCircle } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import ChannelBreakdown from '@/components/ChannelBreakdown';
import WebsiteSnapshot from '@/components/WebsiteSnapshot';
import PropertyMultiSelect from '@/components/PropertyMultiSelect';
import BrandThemeProvider from '@/components/BrandThemeProvider';
import { PORTFOLIO_SUMMARY } from '@/lib/mockData';
import { trpc } from '@/lib/trpc';
import { Building2, LayoutDashboard, ChevronRight, PanelLeftClose, PanelLeftOpen, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function getBrandBadgeClass(brand: string) {
  if (!brand) return 'brand-default';
  const slug = brand.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `brand-${slug}`;
}

export default function SharedDashboard() {
  const [, params] = useRoute('/share/:token');
  const token = params?.token as string;

  const { data: PROPERTIES = [] } = trpc.properties.getAll.useQuery();
  const [activePropertyId, setActivePropertyId] = useState<string>('');

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pbsa_shared_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    try {
      localStorage.setItem('pbsa_shared_sidebar_collapsed', JSON.stringify(nextState));
    } catch (e) {
      console.error('Failed to save sidebar collapsed state', e);
    }
  };


  const [hasViewed, setHasViewed] = useState(() => {
    if (typeof sessionStorage !== 'undefined' && token) {
      return sessionStorage.getItem(`viewed_${token}`) === 'true';
    }
    return false;
  });

  // Fetch the shareable token configuration
  const tokenConfigQuery = trpc.sharing.getShareableTokenConfig.useQuery(
    { token, trackView: !hasViewed },
    { enabled: !!token }
  );

  useEffect(() => {
    if (tokenConfigQuery.data?.success && !hasViewed && token) {
      sessionStorage.setItem(`viewed_${token}`, 'true');
      setHasViewed(true);
    }
  }, [tokenConfigQuery.data?.success, hasViewed, token]);

  const config = tokenConfigQuery.data?.config;
  const isLoading = tokenConfigQuery.isLoading;
  const isError = tokenConfigQuery.isError || (tokenConfigQuery.data && !tokenConfigQuery.data.success);

  // Default to the first selected property when config loads
  useEffect(() => {
    if (config?.selectedPropertyIds && config.selectedPropertyIds.length > 0 && !activePropertyId) {
      setActivePropertyId(config.selectedPropertyIds[0]);
    }
  }, [config, activePropertyId]);

  const dateRange = useMemo(() => {
    if (config && (config as any).dateFrom && (config as any).dateTo) {
      return {
        from: new Date((config as any).dateFrom),
        to: new Date((config as any).dateTo)
      };
    }
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return { from: thirtyDaysAgo, to: today };
  }, [config]);


  // Filter properties based on token configuration
  const filteredProperties = useMemo(() => {
    if (!config) return PROPERTIES;

    let props = PROPERTIES;

    // Apply city filter
    if (config.selectedCity !== 'All') {
      props = props.filter((p) => p.city === config.selectedCity);
    }

    // Apply brand filter
    const selectedBrand = (config as any)?.selectedBrand || 'All Brands';
    if (selectedBrand !== 'All Brands') {
      props = props.filter((p) => p.brand === selectedBrand);
    }

    // Apply property selection
    let selectedPropertyIds = config.selectedPropertyIds;

    // If a specific property is selected from the client portal dropdown, override the config
    if (activePropertyId) {
      selectedPropertyIds = [activePropertyId];
    }

    if (selectedPropertyIds && selectedPropertyIds.length > 0) {
      props = props.filter((p) => selectedPropertyIds.includes(p.id));
    }

    return props;
  }, [config, PROPERTIES, activePropertyId]);

  const clientName = useMemo(() => {
    const selectedIds = config?.selectedPropertyIds;
    if (selectedIds && selectedIds.length > 0 && PROPERTIES.length > 0) {
      const selectedProps = PROPERTIES.filter(p => selectedIds.includes(p.id));
      const clients = Array.from(new Set(selectedProps.map((p: any) => p.client).filter(Boolean)));
      if (clients.length === 1 && clients[0]) {
        return clients[0] as string;
      }
    }
    return null;
  }, [config, PROPERTIES]);

  const effectiveBrand = useMemo(() => {
    const selectedBrand = (config as any)?.selectedBrand || 'All Brands';
    if (selectedBrand && selectedBrand !== 'All Brands') return selectedBrand;

    const selectedPropertyIds = config?.selectedPropertyIds;
    if (selectedPropertyIds && selectedPropertyIds.length > 0 && PROPERTIES.length > 0) {
      const firstProp = PROPERTIES.find((p: any) => selectedPropertyIds.includes(p.id));
      if (firstProp) return firstProp.brand;
    }
    return selectedBrand;
  }, [config, PROPERTIES]);

  const dashboardTitle = useMemo(() => {
    const selectedIds = config?.selectedPropertyIds;
    if (selectedIds && selectedIds.length === 1) {
      const prop = PROPERTIES.find(p => p.id === selectedIds[0]);
      if (prop) return prop.name;
    }
    return config?.displayName || 'Executive Performance Overview';
  }, [config, PROPERTIES]);

  // Dynamically compute metrics based on filtered properties
  const computedMetrics = useMemo(() => {
    const totalProperties = filteredProperties.length;
    const totalBeds = filteredProperties.reduce((sum, p) => sum + p.beds, 0);
    const averageOccupancy =
      totalProperties > 0
        ? filteredProperties.reduce((sum, p) => sum + p.occupancyRate, 0) / totalProperties
        : 0;

    // Scale channel metrics
    const scaleFactor = totalBeds / PORTFOLIO_SUMMARY.totalBeds;

    const baseSpend = 176400;
    const baseImpressions = 3125000;
    const baseClicks = 223500;
    const baseConversions = 7520;
    const baseRevenue = 671150;

    return {
      portfolioStats: {
        totalProperties,
        totalBeds,
        averageOccupancy,
      },
      metrics: {
        spend: baseSpend * scaleFactor,
        impressions: Math.floor(baseImpressions * scaleFactor),
        clicks: Math.floor(baseClicks * scaleFactor),
        conversions: Math.floor(baseConversions * scaleFactor),
        revenue: baseRevenue * scaleFactor,
        ctr: (baseClicks / baseImpressions) * 100,
        cpc: baseSpend / baseClicks,
        roas: baseRevenue / baseSpend,
      },
    };
  }, [filteredProperties]);

  const csvMetadata = useMemo(() => {
    return {
      client: clientName || 'Portfolio',
      brand: effectiveBrand,
      properties: activePropertyId
        ? PROPERTIES.find(p => p.id === activePropertyId)?.name
        : config?.selectedPropertyIds?.map((id: string) => PROPERTIES.find(p => p.id === id)?.name).filter(Boolean).join(' | '),
      timeRange: `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
    };
  }, [clientName, effectiveBrand, activePropertyId, config, PROPERTIES, dateRange]);

  const renderActiveView = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        <ChannelBreakdown
          selectedCity={config?.selectedCity || 'All'}
          selectedPropertyIds={activePropertyId ? [activePropertyId] : config?.selectedPropertyIds || []}
          selectedBrand={activePropertyId ? effectiveBrand : (config as any)?.selectedBrand || 'All Brands'}
          computedMetrics={computedMetrics}
          dateRange={dateRange}
          csvMetadata={csvMetadata}
        />
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-slate-50 to-slate-100/80">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-slate-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    const errorMsg = tokenConfigQuery.error?.message || (tokenConfigQuery.data as any)?.error || "Unknown Error";
    const isPaused = errorMsg === "Link is paused by the owner";
    const isAccessDenied = errorMsg.includes("Access Denied") || errorMsg.includes("Authentication required");

    let errorTitle = "Link Not Found";
    let errorDescription = "This shareable link may have expired or is invalid. Please request a new link from the dashboard owner.";
    let errorColor = "text-red-500";

    if (isPaused) {
      errorTitle = "Link Paused";
      errorDescription = "This dashboard link has been temporarily paused by the owner. Please contact the HFS team for access.";
      errorColor = "text-amber-500";
    } else if (isAccessDenied) {
      errorTitle = "Access Denied";
      if (errorMsg.includes("Authentication required")) {
        errorDescription = "Secure authentication is required to view this dashboard. Please ensure you are accessing this link through the proper verification gateway.";
      } else {
        errorDescription = errorMsg.replace("Access Denied: ", "") + " If you believe this is a mistake, please reach out to the dashboard owner for assistance.";
      }
      errorColor = "text-rose-500";
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-slate-50 to-slate-100/80">
        <div className="flex flex-col items-center gap-4 max-w-md">
          <AlertCircle className={`h-12 w-12 ${errorColor}`} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              {errorTitle}
            </h1>
            <p className="text-sm text-slate-600 px-4 leading-relaxed">
              {errorDescription}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-linear-to-b from-slate-50 to-slate-100/80 overflow-x-hidden overflow-hidden">
      <BrandThemeProvider selectedBrand={effectiveBrand} />
      {/* Sticky Header */}
      <DashboardHeader
        onDateRangeChange={() => { }}
        dateRange={dateRange}
        isShared={true}
        selectedBrand={effectiveBrand}
        clientName={clientName}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Client Portal Sidebar */}
        {config?.selectedPropertyIds && config.selectedPropertyIds.length > 1 && (
          <aside className={`flex flex-col border-r border-slate-100 bg-slate-50/50 h-full overflow-y-auto overflow-x-hidden select-none transition-all duration-300 shrink-0 hidden md:flex ${isCollapsed ? 'w-16' : 'w-64'}`}>
            {/* Sidebar Header */}
            <div className="p-4 pb-2">
              <div className={`flex items-center mb-2 px-3 ${isCollapsed ? 'justify-center' : ''}`}>
                {!isCollapsed && (
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Client Portal
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <div className="px-3 mt-1 mb-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="truncate">{clientName || 'Portfolio'}</span>
                  </h3>
                </div>
              )}

              {/* Sidebar Navigation */}
              <nav className="mt-1 space-y-1">
                {!isCollapsed && (
                  <div className="mb-2 px-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Properties
                    </span>
                  </div>
                )}

                {config.selectedPropertyIds.map((id: string) => {
                  const p = PROPERTIES.find(prop => prop.id === id);
                  if (!p) return null;
                  const isActive = activePropertyId === id;

                  const btn = (
                    <button
                      key={id}
                      onClick={() => setActivePropertyId(id)}
                      className={`w-full flex items-center rounded-xl text-xs font-medium transition-all duration-200 ${isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
                        } ${isActive
                          ? 'bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-slate-100'
                          : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                        }`}
                    >
                      {isCollapsed ? (
                        <div className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-1 text-left min-w-0 pr-2">
                            <span className="truncate">{p.name}</span>
                            <span className={`brand-badge ${getBrandBadgeClass(p.brand)} self-start text-[9px] px-1.5 py-0.5 inline-block w-max`}>
                              {p.brand}
                            </span>
                          </div>
                          {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                        </>
                      )}
                    </button>
                  );

                  if (isCollapsed) {
                    return (
                      <TooltipProvider key={id}>
                        <Tooltip>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="right">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">{p.name}</span>
                              <span className="text-[10px] text-slate-400">{p.brand}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }

                  return btn;
                })}
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div className="mt-auto px-2 mb-4 pt-4 border-t border-slate-200/60">
              <button
                onClick={toggleCollapse}
                className={`w-full flex items-center rounded-xl text-xs font-medium transition-all duration-200 text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 ${isCollapsed ? 'justify-center p-2' : 'justify-start px-3 py-2.5 gap-2.5'}`}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <PanelLeftOpen className="h-4 w-4 shrink-0" /> : <PanelLeftClose className="h-4 w-4 shrink-0" />}
                {!isCollapsed && <span>Close sidebar</span>}
              </button>
            </div>
          </aside>
        )}

        {/* Scrolling Viewport (takes full remaining width) */}
        <div className="flex-1 overflow-y-auto w-full">
        {/* Main Content (Full Width for Shared Dashboard if no sidebar) */}
        <main className="pt-0 px-3 sm:px-6 md:px-8 pb-6 md:pb-8 w-full">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 sticky top-0 bg-background z-20 pt-3 md:pt-4 pb-2 border-b border-slate-100/50 -mx-3 sm:-mx-6 md:-mx-8 px-3 sm:px-6 md:px-8">
            <div>
              {config?.selectedPropertyIds && config.selectedPropertyIds.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 group hover:opacity-80 transition-opacity outline-none">
                      <h2 className="text-base md:text-xl font-bold text-slate-900 tracking-tight">
                        {activePropertyId
                          ? PROPERTIES.find(p => p.id === activePropertyId)?.name
                          : dashboardTitle}
                      </h2>
                      <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72 max-h-[400px] overflow-y-auto">
                    {config?.selectedPropertyIds?.map((id: string) => {
                      const p = PROPERTIES.find(prop => prop.id === id);
                      if (!p) return null;
                      const isActive = activePropertyId === id;
                      
                      return (
                        <DropdownMenuItem
                          key={id}
                          onClick={() => setActivePropertyId(id)}
                          className={`flex items-center justify-between cursor-pointer py-2 ${isActive ? 'bg-slate-50' : ''}`}
                        >
                          <div className="flex flex-col gap-1 min-w-0 pr-2">
                            <span className={`truncate font-medium ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                              {p.name}
                            </span>
                            <span className={`brand-badge ${getBrandBadgeClass(p.brand)} self-start text-[9px] px-1.5 py-0.5 inline-block w-max`}>
                              {p.brand}
                            </span>
                          </div>
                          {isActive && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <h2 className="text-base md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  {activePropertyId
                    ? PROPERTIES.find(p => p.id === activePropertyId)?.name
                    : dashboardTitle}
                </h2>
              )}
            </div>
          </div>

          {/* Render Active Tab View */}
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
