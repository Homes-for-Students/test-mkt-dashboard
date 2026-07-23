import { format } from 'date-fns';
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Smartphone, Laptop, Tablet, Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut, Copy, Sparkles, TrendingUp, TrendingDown, ArrowUpRight, CheckCircle2, ChevronRight, Share2, MousePointerClick, Search, MapPin, SearchSlash, Filter, Download, ChartLine, Trophy, Phone, ChartPie, ChartSpline, Star, MessageSquare, Globe, Plus, Minus, Layers2 } from 'lucide-react';
import { TablePagination } from '@/components/ui/table-pagination';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { trpc } from '@/lib/trpc';
import WebsiteSnapshot from './WebsiteSnapshot';
import GoogleAdsTable from './GoogleAdsTable';
import { getBrandDomain, AI_REFERRAL_DATA, AIReferralItem, USERS_BY_DAY, VIEWS_BY_COUNTRY, VIEWS_BY_DEVICE, CountryViewItem, DeviceViewItem, USER_SOURCES, UserSourceItem } from './WebsitePerformance';
import ExportButtonGroup from '@/components/ExportButtonGroup';
import { exportToJpeg, exportToCsv } from '@/lib/exportUtils';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

function SectionHelp({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none shrink-0 inline-flex items-center">
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3 text-[11px] bg-slate-900 text-white rounded-lg shadow-xl border border-slate-800 leading-relaxed whitespace-pre-line z-[100]">
          {text}
        </TooltipContent>
      </UITooltip>
    </TooltipProvider>
  );
}


// Refined channel details according to requirements
const GOOGLE_ADS_DATA = {
  name: 'Google Ads',
  spend: 82000,
  searchImpShare: 78.4,
  clicks: 95000,
  impressions: 1210000,
  ctr: 7.85,
  avgCpc: 0.86,
  searches: 1540000,
  color: 'var(--chart-1)',
};

const META_ADS_DATA = {
  name: 'Meta Ads',
  spend: 59900,
  clicks: 92500,
  avgCpc: 0.65,
  color: 'var(--chart-2)',
};

const GOOGLE_MAPS_DATA = {
  name: 'Google Maps',
  reviews: 142,
  rating: 4.6,
  phoneCalls: 320,
  websiteVisits: 8000,
  color: 'var(--chart-3)',
};

const STUDENT_CROWD_DATA = {
  name: 'StudentCrowd',
  totalReviews: 84,
  overallRating: 4.3,
  reviewsLast30Days: 12,
  ratingLast30Days: 4.8,
  color: 'var(--chart-4)',
};

interface ChannelBreakdownProps {
  selectedCity?: string;
  selectedPropertyIds?: string[];
  selectedBrand?: string;
  computedMetrics?: {
    portfolioStats: {
      totalProperties: number;
      totalBeds: number;
      averageOccupancy: number;
    };
    metrics: {
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
      revenue: number;
      ctr: number;
      cpc: number;
      roas: number;
    };
  };
  dateRange: { from: Date; to: Date };
  csvMetadata?: any;
}

export default function ChannelBreakdown({
  selectedCity = 'All',
  selectedPropertyIds = [],
  selectedBrand = 'All Brands',
  computedMetrics,
  dateRange,
  csvMetadata = {}
}: ChannelBreakdownProps) {
  // Fetch active properties list
  const { data: PROPERTIES = [] } = trpc.properties.getAll.useQuery();
  const { data: brandColors = {} } = trpc.brandColors.getAll.useQuery();

  const effectiveBrand = useMemo(() => {
    if (selectedBrand && selectedBrand !== 'All Brands') return selectedBrand;
    if (selectedPropertyIds && selectedPropertyIds.length > 0 && PROPERTIES.length > 0) {
      const firstProp = PROPERTIES.find((p: any) => selectedPropertyIds.includes(p.id));
      if (firstProp) return firstProp.brand;
    }
    return selectedBrand;
  }, [selectedBrand, selectedPropertyIds, PROPERTIES]);

  // Query live data from the backend Google Sheets & Supermetrics router
  const { data: liveData, isLoading: supermetricsLoading } = trpc.analytics.getChannelBreakdown.useQuery({
    selectedCity,
    selectedPropertyIds,
    selectedBrand,
    dateRange: {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd'),
    }
  });

  const { data: ga4Data, isLoading: ga4Loading } = trpc.analytics.getWebsitePerformance.useQuery({
    selectedCity,
    selectedPropertyIds,
    selectedBrand,
    dateRange: {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd'),
    }
  });

  const { data: searchTermsData } = trpc.analytics.getGoogleAdsSearchTerms.useQuery({
    selectedCity,
    selectedPropertyIds,
    selectedBrand,
    dateRange: {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd')
    }
  });
  const googleAdsSearchTerms = React.useMemo(() => {
    return searchTermsData?.searchTerms || [];
  }, [searchTermsData]);

  const [tooltipContent, setTooltipContent] = React.useState<{ name: string; views: number; percentage: string } | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
  const [position, setPosition] = React.useState({ coordinates: [0, 20] as [number, number], zoom: 1 });
  const [activeTab, setActiveTab] = React.useState<'firstUser' | 'searchTerms' | 'aiTraffic'>('firstUser');
  const [firstUserPage, setFirstUserPage] = React.useState(1);
  const [aiPage, setAiPage] = React.useState(1);
  const [isExportingAI, setIsExportingAI] = React.useState(false);

  const handleExportAIJpeg = async () => {
    setIsExportingAI(true);
    setTimeout(async () => {
      await exportToJpeg('ai-traffic-overview-card', 'AI-Traffic-Overview');
      setIsExportingAI(false);
    }, 150);
  };

  const handleZoomIn = () => {
    if (position.zoom >= 8) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom * 1.5 }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition(pos => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleMoveEnd = (position: { coordinates: [number, number]; zoom: number }) => {
    setPosition(position);
  };
  const isLoading = supermetricsLoading || ga4Loading;
  if (isLoading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center space-y-4 animate-pulse">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Live Data...</p>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  const formatCpc = (val: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('en-GB').format(val);

  // Extract variables, falling back to client-side filtered mock metrics
  const totalSales = liveData?.executiveStats.totalSales ?? computedMetrics?.metrics.revenue ?? 671150;
  const salesWeek = liveData?.executiveStats.salesWeek ?? (totalSales * 0.23);
  const occupancyRate = liveData?.executiveStats.occupancyRate ?? computedMetrics?.portfolioStats.averageOccupancy ?? 93.45;

  const googleAdsImpShare = liveData?.channelPerformance.googleAds.searchImpShare ?? GOOGLE_ADS_DATA.searchImpShare;
  const googleAdsSearchImpShare = typeof googleAdsImpShare === 'number' ? googleAdsImpShare : parseFloat(googleAdsImpShare || '0');
  const googleAdsClicks = liveData?.channelPerformance.googleAds.clicks ?? GOOGLE_ADS_DATA.clicks;
  const googleAdsImpressions = liveData?.channelPerformance.googleAds.impressions ?? GOOGLE_ADS_DATA.impressions;
  const googleAdsCtrStr = liveData?.channelPerformance.googleAds.ctr ?? GOOGLE_ADS_DATA.ctr;
  const googleAdsCtr = typeof googleAdsCtrStr === 'number' ? googleAdsCtrStr : parseFloat(googleAdsCtrStr || '0');
  const googleAdsAvgCpcStr = liveData?.channelPerformance.googleAds.avgCpc ?? GOOGLE_ADS_DATA.avgCpc;
  const googleAdsAvgCpc = typeof googleAdsAvgCpcStr === 'number' ? googleAdsAvgCpcStr : parseFloat(googleAdsAvgCpcStr || '0');
  const googleAdsSearches = liveData?.channelPerformance.googleAds.searches ?? GOOGLE_ADS_DATA.searches;
  const googleAdsSpendStr = liveData?.channelPerformance.googleAds.spend ?? GOOGLE_ADS_DATA.spend;
  const googleAdsSpend = typeof googleAdsSpendStr === 'number' ? googleAdsSpendStr : parseFloat(googleAdsSpendStr || '0');

  const isQuotaLimited = selectedPropertyIds.length > 5 || (selectedPropertyIds.length === 0 && PROPERTIES.length > 5);

  const metaAdsSpendStr = liveData?.channelPerformance.metaAds.spend ?? META_ADS_DATA.spend;
  const metaAdsSpend = typeof metaAdsSpendStr === 'number' ? metaAdsSpendStr : parseFloat(metaAdsSpendStr || '0');
  const metaAdsClicks = liveData?.channelPerformance.metaAds.clicks ?? META_ADS_DATA.clicks;
  const metaAdsAvgCpcStr = liveData?.channelPerformance.metaAds.avgCpc ?? META_ADS_DATA.avgCpc;
  const metaAdsAvgCpc = typeof metaAdsAvgCpcStr === 'number' ? metaAdsAvgCpcStr : parseFloat(metaAdsAvgCpcStr || '0');

  const firstUserAcquisition = (ga4Data?.firstUserAcquisition ?? USER_SOURCES) as UserSourceItem[];
  const aiReferralData = (ga4Data?.aiReferralData ?? AI_REFERRAL_DATA) as AIReferralItem[];
  const usersByDay = (ga4Data?.usersByDay ?? USERS_BY_DAY) as Array<{ day: string; users: number }>;
  const viewsByCountry = (ga4Data?.viewsByCountry ?? VIEWS_BY_COUNTRY) as CountryViewItem[];
  const viewsByDevice = (ga4Data?.viewsByDevice ?? VIEWS_BY_DEVICE) as DeviceViewItem[];

  const googleMapsReviews = liveData?.channelPerformance.googleMaps.reviews ?? 0;
  const googleMapsRating = liveData?.channelPerformance.googleMaps.rating ?? 0;
  const googleMapsPhoneCalls = liveData?.channelPerformance.googleMaps.phoneCalls ?? 0;
  const googleMapsWebsiteVisits = liveData?.channelPerformance.googleMaps.websiteVisits ?? 0;

  const scTotalReviews = liveData?.channelPerformance.studentCrowd.totalReviews ?? STUDENT_CROWD_DATA.totalReviews;
  const scOverallRating = liveData?.channelPerformance.studentCrowd.overallRating ?? STUDENT_CROWD_DATA.overallRating;
  const scReviewsLast30Days = liveData?.channelPerformance.studentCrowd.reviewsLast30Days ?? STUDENT_CROWD_DATA.reviewsLast30Days;
  const scRatingLast30Days = liveData?.channelPerformance.studentCrowd.ratingLast30Days ?? STUDENT_CROWD_DATA.ratingLast30Days;

  // Dynamic charts data source
  const adSpendData = [
    { name: 'Google Ads', Spend: googleAdsSpend, Clicks: googleAdsClicks, fill: GOOGLE_ADS_DATA.color },
    { name: 'Meta Ads', Spend: metaAdsSpend, Clicks: metaAdsClicks, fill: META_ADS_DATA.color }
  ];

  const totalAdSpend = googleAdsSpend + metaAdsSpend;

  const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

  const maxViews = !viewsByCountry || viewsByCountry.length === 0
    ? 1
    : Math.max(...viewsByCountry.map(c => c.views));

  const colorScale = scaleLinear<string>()
    .domain([0, maxViews > 10 ? maxViews * 0.1 : maxViews / 2, maxViews])
    .range(["#f1f5f9", "#94a3b8", "#0f172a"]); // Slate 100 -> Slate 400 -> Slate 900

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 border border-slate-100 rounded-xl p-3 shadow-lg backdrop-blur-md text-xs space-y-1">
          <p className="font-bold text-slate-800">{label}</p>
          {payload.map((pld: any) => (
            <p key={pld.name} className="flex items-center gap-2 font-medium" style={{ color: pld.color || pld.fill }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pld.color || pld.fill }} />
              <span>{pld.name}:</span>
              <strong className="font-mono">
                {pld.name.includes('Spend') ? formatCurrency(pld.value) : formatNumber(pld.value)}
              </strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Executive Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        {/* Sales (week) */}
        <div className="col-span-1 p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-start md:justify-between h-full">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Sales (week)
              <SectionHelp text="Weekly updates on sales figures and occupancy levels, refreshed every Friday afternoon/Monday morning." />
            </span>
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0">
              <ChartLine className="h-4 w-4 text-slate-800" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900 leading-tight">
                {formatNumber(salesWeek)} {salesWeek === 1 ? 'room' : 'rooms'}
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-1.5"></span>
          </div>
        </div>

        {/* Total Sales */}
        <div className="col-span-1 p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-start md:justify-between h-full">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Total Sales
              <SectionHelp text="Weekly updates on sales figures and occupancy levels, refreshed every Friday afternoon/Monday morning." />
            </span>
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0">
              <Trophy className="h-4 w-4 text-slate-800" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900 leading-tight">
                {formatNumber(totalSales)} {totalSales === 1 ? 'room' : 'rooms'}
              </span>
              {liveData?.executiveStats.totalSalesGrowth !== undefined && (
                <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded-md border ${liveData.executiveStats.totalSalesGrowth >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                  {liveData.executiveStats.totalSalesGrowth > 0 ? '+' : ''}{liveData.executiveStats.totalSalesGrowth}%
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 block mt-1.5"></span>
          </div>
        </div>

        {/* Occupancy % */}
        <div className="col-span-2 md:col-span-1 p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-start md:justify-between h-full">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Occupancy %
              <SectionHelp text="Weekly updates on sales figures and occupancy levels, refreshed every Friday afternoon/Monday morning." />
            </span>
            <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0">
              <ChartPie className="h-4 w-4 text-slate-800" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900 leading-tight">
                {occupancyRate.toFixed(1)}%
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-1.5"></span>
          </div>
        </div>
      </div>


      {/* 1 & 2. EXECUTIVE SNAPSHOT & PAID PERFORMANCE */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 pt-2">
        {/* Left Side: Website Performance Snapshot */}
        <div className="h-full">
          <WebsiteSnapshot
            selectedCity={selectedCity}
            selectedPropertyIds={selectedPropertyIds}
            selectedBrand={selectedBrand}
            dateRange={dateRange}
            csvMetadata={csvMetadata}
          />
        </div>

        {/* Right Side: Paid & Local Performance */}
        <div className="h-full flex flex-col">
          <Card id="paid-local-performance-card" className="group/card border-slate-100/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden h-full flex flex-col justify-between relative py-0 gap-0">
            <CardHeader className="p-5 pb-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base font-bold text-slate-900 tracking-tight flex items-start sm:items-center gap-2">
                    <Layers2 className="h-4.5 w-4.5 text-slate-800 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="leading-tight">Paid & Local Performance</span>
                  </CardTitle>
                  <div className="shrink-0 -mt-1 -mr-1">
                    <ExportButtonGroup
                      onExportJpeg={() => exportToJpeg('paid-local-performance-card', 'Paid-Local-Performance')}
                      onExportCsv={() => exportToCsv([
                        {
                          'Channel': 'Google Ads',
                          'Spend': formatCurrency(googleAdsSpend),
                          'Search Imp. Share': `${googleAdsSearchImpShare}%`,
                          'Clicks': googleAdsClicks,
                          'Impressions': googleAdsImpressions,
                          'CTR': `${googleAdsCtr}%`,
                          'Avg CPC': formatCurrency(googleAdsAvgCpc),
                          'Searches': googleAdsSearches
                        },
                        {
                          'Channel': 'Meta Ads',
                          'Spend': formatCurrency(metaAdsSpend),
                          'Clicks': metaAdsClicks,
                          'Avg CPC': formatCurrency(metaAdsAvgCpc)
                        },
                        {
                          'Channel': 'Google Maps',
                          'Reviews': googleMapsReviews,
                          'Rating': googleMapsRating,
                          'Phone Calls': googleMapsPhoneCalls,
                          'Website Visits': googleMapsWebsiteVisits
                        },
                        {
                          'Channel': 'StudentCrowd',
                          'Total Reviews': scTotalReviews,
                          'Overall Rating': scOverallRating,
                          'Reviews (Last 30 Days)': scReviewsLast30Days,
                          'Rating (Last 30 Days)': scRatingLast30Days
                        }
                      ], 'Paid-Local-Performance', csvMetadata)}
                    />
                  </div>
                </div>
                <CardDescription className="hidden sm:block text-xs text-slate-400 font-medium">
                  Overview of ad spend and local listings performance
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0 flex-1 flex flex-col justify-start gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                {/* Google Ads Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-start h-full">
                  <div className="flex items-center mb-1.5 justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <img src="/logos/google-ads.png" alt="Google Ads" className="h-4 w-4 object-contain" /> Google Ads
                      <SectionHelp text={`Paid Marketing (Google Ads) Updates daily. - A breakdown of ad performance, including: 

Spend - Total advertising costs in the selected date range. 

Search Impression Share (SIS) - The percentage of relevant searches where your ad appeared (we aim for 70% where budget allows though this may fluctuate by region). 

Clicks - The number of times people clicked on your ads. 

Impressions - How often your ads were displayed in searches.

CTR (Click-Through Rate) - The percentage of people who clicked your ad after seeing it (5-6% is typical for property and education). 

CPC (cost per click) - how much it costs each time a user clicks on the ad`} />
                    </span>
                  </div>
                  {googleAdsSpend === 0 ? (
                    <div className="flex flex-1 items-center justify-center border-t border-slate-50 pt-6 pb-4">
                      <span className="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-50 rounded-full border border-slate-100">No live campaigns</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-50 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Spend</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatCurrency(googleAdsSpend)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Search Imp. Share</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{googleAdsSearchImpShare}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Clicks</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatNumber(googleAdsClicks)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Impressions</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatNumber(googleAdsImpressions)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">CTR</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{googleAdsCtr}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Avg CPC</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatCpc(googleAdsAvgCpc)}</span>
                      </div>
                      <div className="flex flex-col col-span-2 border-t border-slate-50/60 pt-1.5">
                        <span className="text-[12px] text-slate-400 font-medium">Searches</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatNumber(googleAdsSearches)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Meta Ads Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-start h-full">
                  <div className="flex items-center mb-1.5 justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <img src="/logos/meta-ads.png" alt="Meta Ads" className="h-4 w-4 object-contain" /> Meta Ads
                      <SectionHelp text={`Paid Marketing (Meta Ads) Updates daily. - A breakdown of ad performance, including:

Spend - Total advertising costs in the past 30 days. 

Clicks - The number of times people clicked on your ads. 

Avg. CPC (average cost per click) - how much it costs each time a user clicks on the ad`} />
                    </span>
                  </div>
                  {metaAdsSpend === 0 ? (
                    <div className="flex flex-1 items-center justify-center border-t border-slate-50 pt-6 pb-4">
                      <span className="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-50 rounded-full border border-slate-100">No live campaigns</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-50 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Spend</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatCurrency(metaAdsSpend)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Clicks</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatNumber(metaAdsClicks)}</span>
                      </div>
                      <div className="flex flex-col col-span-2 border-t border-slate-50/60 pt-1.5">
                        <span className="text-[12px] text-slate-400 font-medium">Avg CPC</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatCpc(metaAdsAvgCpc)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Google Maps Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-start h-full">
                  <div className="flex items-center mb-1.5">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <img src="/logos/google-maps.png" alt="Google Maps" className="h-4 w-4 object-contain" /> Google Maps
                    </span>
                  </div>
                  {googleMapsReviews === 0 ? (
                    <div className="flex flex-1 items-center justify-center border-t border-slate-50 pt-6 pb-4">
                      <span className="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-50 rounded-full border border-slate-100">Not available</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-50 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Total Reviews</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatNumber(googleMapsReviews)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Avg Rating</span>
                        <span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                          {googleMapsRating} / 5
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Phone Calls</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatNumber(googleMapsPhoneCalls)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Website Visits</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatNumber(googleMapsWebsiteVisits)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* StudentCrowd Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.02)] transition-all flex flex-col justify-start h-full">
                  <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <img src="/logos/studentcrowd.png" alt="StudentCrowd" className="h-4 w-12 object-contain" /> StudentCrowd
                    </CardTitle>
                  </CardHeader>
                  {scTotalReviews === 0 ? (
                    <div className="flex flex-1 items-center justify-center border-t border-slate-50 pt-6 pb-4">
                      <span className="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-50 rounded-full border border-slate-100">No reviews found</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-50 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Total Reviews</span>
                        <span className="text-[12px] text-slate-800 font-semibold">{formatNumber(scTotalReviews)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] text-slate-400 font-medium">Avg Rating</span>
                        <div className="flex items-center mt-0.5">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 text-[12px] font-bold py-0.5 px-1.5 rounded-md flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />
                            {scOverallRating.toLocaleString('en-UK', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} / 5
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col col-span-2 border-t border-slate-50/60 pt-1.5">
                        <span className="text-[12px] text-slate-400 font-medium">Reviews (Last 30d)</span>
                        <span className="text-[12px] text-slate-800 font-semibold">+{formatNumber(scReviewsLast30Days)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mb-8">
        <Card className="border-slate-100/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden flex flex-col relative py-0 gap-0">
          <CardHeader className="p-5 pb-3 border-b border-slate-100">
            <div className="mb-4">
              <CardTitle className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Layers2 className="h-5 w-5 text-slate-700" />
                Deep Dive Analytics
              </CardTitle>
              <CardDescription className="hidden sm:block text-sm text-slate-500 mt-1">
                Explore detailed breakdown for user acquisition, search terms, and AI traffic sources.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center bg-slate-50/80 p-1 rounded-lg border border-slate-100/60 shadow-sm overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setActiveTab('firstUser')}
                  className={`px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeTab === 'firstUser' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  First User Acquisition
                  <SectionHelp text="First User Acquisition - Track how new users initially discover your website, showing the acquisition channel (e.g. Organic Search, Paid Ads, Social Media, or Direct). Updates daily." />
                </button>
                <button
                  onClick={() => setActiveTab('searchTerms')}
                  className={`px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeTab === 'searchTerms' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Google Ads Search Terms
                  <SectionHelp text="Search Terms - Insights into which search terms drive the most traffic to your site. Updates daily." />
                </button>
                <button
                  onClick={() => setActiveTab('aiTraffic')}
                  className={`px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeTab === 'aiTraffic' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  AI Traffic Overview
                  <SectionHelp text="AI Traffic - Insights into traffic driven to your site via major artificial intelligence engines and search tools (e.g. ChatGPT, Claude, Gemini). Updates daily." />
                </button>
              </div>
              <div className="shrink-0">
                {activeTab === 'aiTraffic' && (
                  <ExportButtonGroup
                    onExportJpeg={handleExportAIJpeg}
                    onExportCsv={() => {
                      exportToCsv(aiReferralData.map(item => ({
                        Name: item.source,
                        'Landing Page': item.topLandingPage,
                        Sessions: item.users,
                        'Avg Session Duration': item.avgSession
                      })), 'AI-Traffic-Overview', csvMetadata)
                    }}
                    csvOnly={true}
                  />
                )}
                {activeTab === 'firstUser' && (
                  <ExportButtonGroup
                    onExportJpeg={() => { }}
                    onExportCsv={() => {
                      exportToCsv(firstUserAcquisition.map(item => ({
                        'First User Source/Medium': item.source,
                        'Total Users': item.users,
                        'New Users': item.newUsers,
                        'Avg Session Duration': item.avgSession,
                        'Engagement Rate': item.engagementRate
                      })), 'First-User-Acquisition', csvMetadata)
                    }}
                    csvOnly={true}
                  />
                )}
                {activeTab === 'searchTerms' && (
                  <ExportButtonGroup
                    onExportJpeg={() => { }}
                    onExportCsv={() => {
                      exportToCsv(googleAdsSearchTerms.map((item: any) => ({
                        'Search Term': item.searchTerm,
                        'Spend': `£${item.spend.toFixed(2)}`,
                        'Clicks': item.clicks,
                        'Impressions': item.impressions,
                        'CTR': `${item.ctr.toFixed(2)}%`,
                        'Avg CPC': `£${item.cpc.toFixed(2)}`
                      })), 'Google-Ads-Search-Terms', csvMetadata)
                    }}
                    csvOnly={true}
                  />
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {activeTab === 'searchTerms' && (
              <div className="p-5">
                <GoogleAdsTable
                  limit={10}
                  showSearch={false}
                  compact={true}
                  selectedCity={selectedCity}
                  selectedPropertyIds={selectedPropertyIds}
                  selectedBrand={selectedBrand}
                  dateRange={dateRange}
                  csvMetadata={csvMetadata}
                  hideHeader={true}
                />
              </div>
            )}

            {activeTab === 'firstUser' && (
              <div className="p-5 flex-1">
                <div className="rounded-xl border border-slate-100 overflow-x-auto">
                  <div className="min-w-[600px]">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/70">
                        <tr className="border-b border-slate-100 hover:bg-transparent">
                          <th className="text-left py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">First user source/medium</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Total Users</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">New Users</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Avg Session Duration</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Engagement Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {firstUserAcquisition.slice((firstUserPage - 1) * 10, firstUserPage * 10).map((source, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 text-slate-900 font-semibold text-xs">{source.source}</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-700">{source.users.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-700">{source.newUsers?.toLocaleString() || 0}</td>
                            <td className="py-2 px-3 text-right text-slate-600 font-semibold">{source.avgSession}</td>
                            <td className="py-2 px-3 text-right">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                {source.engagementRate}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {firstUserAcquisition.length > 10 && (
                  <div className="mt-4 flex justify-end">
                    <TablePagination
                      currentPage={firstUserPage}
                      totalItems={firstUserAcquisition.length}
                      itemsPerPage={10}
                      onPageChange={setFirstUserPage}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'aiTraffic' && (
              <div className="p-5 flex-1 overflow-hidden" id="ai-traffic-overview-card">
                <div className="rounded-xl border border-slate-100 overflow-x-auto">
                  <div className="min-w-[600px]">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50/70">
                        <tr className="border-b border-slate-100 hover:bg-transparent">
                          <th className="text-left py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Name</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Landing Page</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Sessions</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Avg Session Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isExportingAI ? aiReferralData : aiReferralData.slice((aiPage - 1) * 10, aiPage * 10)).map((source: AIReferralItem, idx: number) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-1.5 w-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: Object.values(brandColors).find((c: any) => c.brand === effectiveBrand)?.backgroundColor || '#6366f1' }}
                                />
                                <span className="text-slate-900 font-medium">{source.source}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-left text-slate-600 font-medium max-w-[250px] group relative">
                              <div className="flex items-center justify-between">
                                <span className="truncate flex-1 mr-2" title={source.topLandingPage}>
                                  {source.topLandingPage || '/'}
                                </span>
                                {source.topLandingPage && source.topLandingPage !== '/' && (
                                  <button
                                    onClick={() => {
                                      const fullUrl = source.hostName ? `https://${source.hostName}${source.topLandingPage}` : `${getBrandDomain(effectiveBrand)}${source.topLandingPage}`;
                                      navigator.clipboard.writeText(fullUrl);
                                      toast.success('URL copied to clipboard!');
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
                                    title="Copy full URL"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700 font-medium">
                              {source.sessions?.toLocaleString() || source.users?.toLocaleString() || 0}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                              {source.avgSession}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {!isExportingAI && aiReferralData.length > 10 && (
                  <div className="mt-4 flex justify-end">
                    <TablePagination
                      currentPage={aiPage}
                      totalItems={aiReferralData.length}
                      itemsPerPage={10}
                      onPageChange={setAiPage}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. Users by Day and Views by Device */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Users by Day of Week (Refined chart height & gaps) */}
        <div id="users-by-day-card" className="group/card bg-white rounded-lg border border-slate-200 p-5 lg:col-span-2 relative">
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900 mt-0.5 sm:mt-0 flex items-center gap-1.5">
                Users by Day of Week
                <SectionHelp text="User Behaviour - Discover the busiest days for site visits, which devices visitors use, and where they’re located. Updates daily." />
              </h3>
              <div className="shrink-0 -mt-1 -mr-1">
                <ExportButtonGroup
                  onExportJpeg={() => exportToJpeg('users-by-day-card', 'Users-By-Day')}
                  onExportCsv={() => exportToCsv(usersByDay, 'Users-By-Day', csvMetadata)}
                />
              </div>
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usersByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="users" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Views by Device (Granular Breakdown) */}
        <div id="views-by-device-card" className="group/card bg-white rounded-lg border border-slate-200 p-5 relative">
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2">
                <Smartphone className="h-4.5 w-4.5 text-orange-655 shrink-0 mt-0.5 sm:mt-0" />
                <h3 className="text-sm font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
                  Views by Device
                  <SectionHelp text="User Behaviour - Discover the busiest days for site visits, which devices visitors use, and where they’re located. Updates daily." />
                </h3>
              </div>
              <div className="shrink-0 -mt-1 -mr-1">
                <ExportButtonGroup
                  onExportJpeg={() => exportToJpeg('views-by-device-card', 'Views-By-Device')}
                  onExportCsv={() => exportToCsv(viewsByDevice, 'Views-By-Device', csvMetadata)}
                />
              </div>
            </div>
          </div>
          <div className="h-[220px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={viewsByDevice}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="views"
                  nameKey="device"
                >
                  {viewsByDevice.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50">
            {viewsByDevice.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.device}</span>
                <span className="ml-auto font-bold text-slate-800">{item.percentage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Views by Country */}
      <div id="views-by-country-card" className="group/card bg-white rounded-lg border border-slate-200 p-5 mb-6 relative">
        <div className="flex flex-col gap-1.5 mb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2">
              <Globe className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
              <h3 className="text-sm font-semibold text-slate-900 leading-tight">Views by Country/Region</h3>
            </div>
            <div className="shrink-0 -mt-1 -mr-1">
              <ExportButtonGroup
                onExportJpeg={() => exportToJpeg('views-by-country-card', 'Views-By-Country')}
                onExportCsv={() => exportToCsv(viewsByCountry, 'Views-By-Country', csvMetadata)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Geo Map Left */}
          <div className="lg:col-span-2 w-full h-[300px] bg-slate-50 rounded border border-slate-100 overflow-hidden flex items-center justify-center relative">
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 100 }} width={800} height={400} style={{ width: "100%", height: "100%" }}>
              <ZoomableGroup
                zoom={position.zoom}
                center={position.coordinates}
                onMoveEnd={handleMoveEnd}
                minZoom={1}
                maxZoom={8}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const countryName = geo.properties.name;
                      const dataItem = viewsByCountry.find(c =>
                        c.country === countryName ||
                        (c.country === 'United States' && countryName === 'United States of America') ||
                        (c.country === 'United Kingdom' && countryName === 'United Kingdom')
                      );

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={dataItem ? colorScale(dataItem.views) : "#f1f5f9"}
                          stroke="#cbd5e1"
                          strokeWidth={0.5}
                          onMouseEnter={(e) => {
                            setTooltipContent({
                              name: countryName,
                              views: dataItem ? dataItem.views : 0,
                              percentage: dataItem ? dataItem.percentage : '0.0%'
                            });
                            setTooltipPos({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => {
                            setTooltipPos({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => {
                            setTooltipContent(null);
                          }}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: dataItem ? "#64748b" : "#f1f5f9", outline: "none" },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
            <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 shadow-sm rounded-md overflow-hidden bg-white/90 backdrop-blur border border-slate-200 export-ignore">
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors border-b border-slate-100"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Right */}
          <div className="lg:col-span-1 flex flex-col justify-center">
            <div className="mb-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider border-b border-slate-50 pb-2">
              Showing Top 10
            </div>
            <div className="space-y-5 mb-2">
              {viewsByCountry.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-medium">{item.country}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: item.percentage }}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 w-10 text-right">{item.percentage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Map Tooltip Portal */}
      {tooltipContent && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded shadow-xl font-medium flex items-center gap-3 transform -translate-x-1/2 -translate-y-full"
          style={{ top: tooltipPos.y - 15, left: tooltipPos.x }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">{tooltipContent.name}</span>
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300">Views:</span>
            <span>{tooltipContent.views.toLocaleString()}</span>
            <span className="text-sky-400 font-bold">({tooltipContent.percentage})</span>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
