import { format, subDays } from 'date-fns';
import React, { useState, useMemo, useEffect } from 'react';
import { MapPinned } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import DashboardSidebar from '@/components/DashboardSidebar';
import ChannelBreakdown from '@/components/ChannelBreakdown';
import SearchConsoleTable from '@/components/SearchConsoleTable';
import GoogleAdsTable from '@/components/GoogleAdsTable';
import WebsiteSnapshot from '@/components/WebsiteSnapshot';
import WebsitePerformance from '@/components/WebsitePerformance';
import ShareableLinksTab from '@/components/ShareableLinksTab';
import PropertyManagement from '@/pages/PropertyManagement';

import PropertyMultiSelect from '@/components/PropertyMultiSelect';
import BrandThemeProvider from '@/components/BrandThemeProvider';
import CityResearchModal from '@/components/CityResearchModal';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Home() {
  const { data: PROPERTIES = [] } = trpc.properties.getAll.useQuery();

  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [searchView, setSearchView] = useState<'paid' | 'organic'>('paid');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCityResearchModalOpen, setIsCityResearchModalOpen] = useState(false);

  const { isLoading: isLoadingAnalytics } = trpc.analytics.getChannelBreakdown.useQuery({
    selectedCity,
    selectedPropertyIds,
    dateRange: {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd')
    }
  });

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedCity = localStorage.getItem('pbsa_selectedCity');
    const savedPropertyIds = localStorage.getItem('pbsa_selectedPropertyIds');
    const savedBrand = localStorage.getItem('pbsa_selectedBrand');

    if (savedCity) {
      setSelectedCity(savedCity);
    }
    if (savedBrand) {
      setSelectedBrand(savedBrand);
    }
    if (savedPropertyIds) {
      try {
        setSelectedPropertyIds(JSON.parse(savedPropertyIds));
      } catch (e) {
        console.error('Failed to parse saved property IDs', e);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pbsa_selectedCity', selectedCity);
  }, [selectedCity]);

  useEffect(() => {
    localStorage.setItem('pbsa_selectedPropertyIds', JSON.stringify(selectedPropertyIds));
  }, [selectedPropertyIds]);

  useEffect(() => {
    localStorage.setItem('pbsa_selectedBrand', selectedBrand);
  }, [selectedBrand]);

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    // When brand changes, completely wipe the previous selected properties
    setSelectedPropertyIds([]);

    // Check if the currently selected city exists under the new brand
    if (brand !== 'All Brands') {
      const brandCities = PROPERTIES.filter((p) => p.brand === brand).map((p) => p.city);
      if (selectedCity !== 'All' && !brandCities.includes(selectedCity)) {
        setSelectedCity('All');
      }
    }
  };

  // Compute unique cities for the sidebar filter based on selected brand
  const cities = useMemo(() => {
    const targetProps = selectedBrand === 'All Brands'
      ? PROPERTIES
      : PROPERTIES.filter(p => p.brand === selectedBrand);
    const allCities = targetProps.map((p) => p.city);
    return ['All', ...Array.from(new Set(allCities))];
  }, [PROPERTIES, selectedBrand]);

  // Filter properties based on city and brand selection
  const filteredProperties = useMemo(() => {
    let result = PROPERTIES;
    if (selectedCity !== 'All') {
      result = result.filter((p) => p.city === selectedCity);
    }
    if (selectedBrand !== 'All Brands') {
      result = result.filter((p) => p.brand === selectedBrand);
    }
    return result;
  }, [PROPERTIES, selectedCity, selectedBrand]);

  // Dynamically compute metrics based on selected city (PBSA Specific)
  const computedMetrics = useMemo(() => {
    const totalProperties = filteredProperties.length;
    const totalBeds = filteredProperties.reduce((sum, p) => sum + p.beds, 0);
    const averageOccupancy = filteredProperties.reduce((sum, p) => sum + p.occupancyRate, 0) / (totalProperties || 1);

    // Scale channel metrics realistically based on selected city size
    const portfolioTotalBeds = PROPERTIES.reduce((sum, p) => sum + p.beds, 0);
    const scaleFactor = selectedCity === 'All' ? 1 : totalBeds / (portfolioTotalBeds || 1);

    // Base aggregated portfolio values
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
        cpc: (baseSpend / baseClicks),
        roas: baseRevenue / baseSpend,
      },
    };
  }, [filteredProperties, selectedCity]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 animate-fade-in">
            <ChannelBreakdown
              selectedCity={selectedCity}
              selectedPropertyIds={selectedPropertyIds}
              selectedBrand={selectedBrand}
              computedMetrics={computedMetrics}
              dateRange={dateRange}
            />
          </div>
        );
      case 'campaigns':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/60 shadow-inner">
              <button
                onClick={() => setSearchView('paid')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${searchView === 'paid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
              >
                Paid Search (Google Ads)
              </button>
              <button
                onClick={() => setSearchView('organic')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${searchView === 'organic'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
              >
                Organic Search (GSC)
              </button>
            </div>

            <div className="mt-4">
              {searchView === 'paid' ? (
                <GoogleAdsTable
                  selectedCity={selectedCity}
                  selectedPropertyIds={selectedPropertyIds}
                  selectedBrand={selectedBrand}
                  dateRange={dateRange}
                />
              ) : (
                <SearchConsoleTable
                  selectedCity={selectedCity}
                  selectedPropertyIds={selectedPropertyIds}
                  selectedBrand={selectedBrand}
                  dateRange={dateRange}
                />
              )}
            </div>
          </div>
        );
      case 'ga4':
        return (
          <div className="space-y-6 animate-fade-in">
            <WebsitePerformance
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              selectedCity={selectedCity}
              selectedPropertyIds={selectedPropertyIds}
              selectedBrand={selectedBrand}
            />
          </div>
        );
      case 'shared-links':
        return (
          <div className="space-y-6 animate-fade-in">
            <ShareableLinksTab />
          </div>
        );
      case 'properties':
        return (
          <div className="space-y-6 animate-fade-in -mx-6 md:-mx-8">
            <PropertyManagement />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-linear-to-b from-slate-50 to-slate-100/80 overflow-hidden">
      <BrandThemeProvider selectedBrand={selectedBrand} />
      {/* Sticky Header */}
      <DashboardHeader
        onDateRangeChange={setDateRange}
        dateRange={dateRange}
        selectedBrand={selectedBrand}
        onBrandChange={handleBrandChange}
        selectedPropertyIds={selectedPropertyIds}
        onMenuToggle={() => setIsMobileSidebarOpen(true)}
      />

      {/* Filter Row */}
      {selectedPropertyIds !== undefined && (
        <div className="border-b border-slate-100 bg-slate-50/60 px-3 sm:px-6 md:px-8 py-1.5 sticky top-16 z-30 overflow-visible">
          <div className="flex items-center flex-wrap gap-2 overflow-visible">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Filters:</span>

            {/* Filter Selectors & Badges */}
            <PropertyMultiSelect
              selectedPropertyIds={selectedPropertyIds}
              onSelectionChange={setSelectedPropertyIds}
              selectedCity={selectedCity}
              onCityChange={setSelectedCity}
              selectedBrand={selectedBrand}
            />

            {/* Clear All */}
            {(selectedCity !== 'All' || selectedPropertyIds.length > 0 || selectedBrand !== 'All Brands') && (
              <button
                onClick={() => {
                  setSelectedCity('All');
                  setSelectedPropertyIds([]);
                  setSelectedBrand('All Brands');
                  localStorage.removeItem('pbsa_selectedCity');
                  localStorage.removeItem('pbsa_selectedPropertyIds');
                  localStorage.removeItem('pbsa_selectedBrand');
                  toast.success('Filters cleared');
                }}
                className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-600 transition-colors h-7 flex items-center"
              >
                Clear All
              </button>
            )}

            <div className="flex-1 min-w-[10px]" />
            
            {(() => {
              const isResearchEnabled = selectedCity !== 'All' || selectedPropertyIds.length === 1;
              return (
                <button
                  onClick={() => isResearchEnabled && setIsCityResearchModalOpen(true)}
                  disabled={!isResearchEnabled}
                  className={`group px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-300 h-8 flex items-center gap-1.5 whitespace-nowrap ml-auto cursor-pointer ${
                    isResearchEnabled
                      ? 'text-slate-600 bg-white border border-slate-200 hover:border-amber-500 hover:text-amber-600 hover:shadow-md hover:shadow-amber-500/10'
                      : 'text-slate-300 bg-slate-50 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <MapPinned className={`w-3.5 h-3.5 transition-colors ${
                    isResearchEnabled 
                      ? 'text-slate-400 group-hover:text-amber-500 group-hover:animate-bounce' 
                      : 'text-slate-300'
                  }`} />
                  <span>Market & City Insights</span>
                </button>
              );
            })()}
          </div>
        </div>
      )}


      <div className="flex flex-1 overflow-hidden">
        {/* Persistent Sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          cities={cities}
          isLoadingAnalytics={isLoadingAnalytics}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Scrolling Viewport (takes full remaining width) */}
        <div className="flex-1 overflow-y-auto w-full">
          {/* Central Dashboard Content Viewport */}
          <main className="pt-0 px-3 sm:px-6 md:px-8 pb-6 md:pb-8 max-w-7xl mx-auto w-full">
            {/* Section Header — hidden for properties tab which has its own header */}
            {activeTab !== 'properties' && (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 sticky top-0 bg-background z-20 pt-3 md:pt-4 pb-2 border-b border-slate-100/50 -mx-3 sm:-mx-6 md:-mx-8 px-3 sm:px-6 md:px-8">
                <div>
                  <h2 className="text-base md:text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2" style={{ fontFamily: 'var(--title)' }}>
                    {activeTab === 'overview' && 'Executive Performance Overview'}
                    {activeTab === 'campaigns' && 'Search Performance Hub'}
                    {activeTab === 'ga4' && 'Website Performance'}
                    {activeTab === 'shared-links' && 'Shared Links Manager'}
                  </h2>
                  <p className="hidden sm:block text-xs text-slate-400 font-medium mt-1" style={{ fontFamily: 'var(--font)' }}>
                    {activeTab === 'overview' && 'Consolidated view of ad spends, conversions, and direct sheets revenue.'}
                    {activeTab === 'campaigns' && 'Analyze both paid Google Ads campaigns and organic Google search performance side-by-side.'}
                    {activeTab === 'ga4' && 'Track real-time traffic sources, user engagement, and GA4 demographics.'}
                    {activeTab === 'shared-links' && 'Create, track, and revoke access for secure, read-only dashboard links.'}
                  </p>
                </div>
              </div>
            )}

            {/* Render Active Tab View */}
            {renderActiveView()}
          </main>
        </div>
      </div>

      <CityResearchModal
        propertyId={selectedPropertyIds.length === 1 ? selectedPropertyIds[0] : null}
        city={selectedCity !== 'All' ? selectedCity : null}
        isOpen={isCityResearchModalOpen}
        onClose={() => setIsCityResearchModalOpen(false)}
      />
    </div>
  );
}
