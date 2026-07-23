import { format } from 'date-fns';
import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { trpc } from '@/lib/trpc';
import { TrendingUp, Users, Activity, Globe, Smartphone, Calendar, Sparkles, Copy, Check, ChevronDown, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TablePagination } from '@/components/ui/table-pagination';
import { toast } from 'sonner';
import { exportToCsv } from '@/lib/exportUtils';
import ExportButtonGroup from '@/components/ExportButtonGroup';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";


export function RowSelectDropdown({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 5, label: 'Show 5 rows' },
    { value: 10, label: 'Show 10 rows' },
    { value: 20, label: 'Show 20 rows' },
    { value: 100, label: 'Show all rows' }
  ];
  const selectedLabel = options.find(o => o.value === value)?.label || `Show ${value} rows`;

  return (
    <div className="relative z-10" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 text-[11px] border border-slate-200 rounded px-2.5 py-1.5 bg-white text-slate-600 font-medium cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 min-w-[110px]"
      >
        <span>{selectedLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg py-1 overflow-hidden z-50">
          {options.map((option) => (
            <button
              key={option.value}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 ${value === option.value ? 'bg-slate-100 text-slate-900' : 'text-slate-600'}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Mock GA4 data
export const GA4_USERS_DATA = [
  { date: 'Mon 1', users: 2400, usersLastYear: 2210 },
  { date: 'Tue 2', users: 2210, usersLastYear: 2290 },
  { date: 'Wed 3', users: 2290, usersLastYear: 2000 },
  { date: 'Thu 4', users: 2000, usersLastYear: 2181 },
  { date: 'Fri 5', users: 2181, usersLastYear: 2500 },
  { date: 'Sat 6', users: 2500, usersLastYear: 2100 },
  { date: 'Sun 7', users: 2100, usersLastYear: 2800 },
];

export const GA4_ENGAGEMENT_DATA = [
  { date: 'Mon 1', bounceRate: 32, sessionDuration: 4.2 },
  { date: 'Tue 2', bounceRate: 28, sessionDuration: 4.5 },
  { date: 'Wed 3', bounceRate: 35, sessionDuration: 3.8 },
  { date: 'Thu 4', bounceRate: 30, sessionDuration: 4.1 },
  { date: 'Fri 5', bounceRate: 25, sessionDuration: 4.8 },
  { date: 'Sat 6', bounceRate: 38, sessionDuration: 3.5 },
  { date: 'Sun 7', bounceRate: 40, sessionDuration: 3.2 },
];

export const USER_SOURCES = [
  { source: 'Organic Search', users: 8420, avgSession: '4m 32s', engagementRate: '68%' },
  { source: 'Direct', users: 5230, avgSession: '3m 15s', engagementRate: '52%' },
  { source: 'Social Media', users: 3890, avgSession: '5m 12s', engagementRate: '74%' },
  { source: 'Referral', users: 2150, avgSession: '2m 48s', engagementRate: '45%' },
  { source: 'Paid Search', users: 1920, avgSession: '3m 45s', engagementRate: '61%' },
];

// Added AI Traffic Referral sources
export const AI_REFERRAL_DATA = [
  { source: 'ChatGPT', users: 1420, avgSession: '6m 12s', engagementRate: '82%', topLandingPage: '/student-accommodation/london/brooke-hall' },
  { source: 'Claude', users: 980, avgSession: '7m 05s', engagementRate: '85%', topLandingPage: '/blog/10-budget-date-ideas' },
  { source: 'Perplexity', users: 850, avgSession: '5m 45s', engagementRate: '78%', topLandingPage: '/short-term-student-accommodation' },
  { source: 'Gemini', users: 620, avgSession: '4m 50s', engagementRate: '71%', topLandingPage: '/' },
  { source: 'Microsoft Copilot', users: 410, avgSession: '3m 58s', engagementRate: '64%', topLandingPage: '/' },
];

export const USERS_BY_DAY = [
  { day: 'Monday', users: 2400 },
  { day: 'Tuesday', users: 2210 },
  { day: 'Wednesday', users: 2290 },
  { day: 'Thursday', users: 2000 },
  { day: 'Friday', users: 2181 },
  { day: 'Saturday', users: 2500 },
  { day: 'Sunday', users: 2100 },
];

export const VIEWS_BY_COUNTRY = [
  { country: 'United Kingdom', views: 24500, percentage: '42%' },
  { country: 'United States', views: 12300, percentage: '21%' },
  { country: 'Canada', views: 8900, percentage: '15%' },
  { country: 'Australia', views: 6200, percentage: '11%' },
  { country: 'Other', views: 5100, percentage: '11%' },
];

// Expanded Device Types with detailed names and colors
export const VIEWS_BY_DEVICE = [
  { device: 'iPhone (iOS)', views: 20500, percentage: '34.8%', color: 'var(--chart-1)' },
  { device: 'macOS (Mac)', views: 13500, percentage: '22.9%', color: 'var(--chart-2)' },
  { device: 'Windows Desktop', views: 8600, percentage: '14.6%', color: 'var(--chart-3)' },
  { device: 'Android Mobile', views: 8000, percentage: '13.6%', color: 'var(--chart-4)' },
  { device: 'iPad (Tablet)', views: 5200, percentage: '8.8%', color: 'var(--chart-5)' },
  { device: 'Android Tablet', views: 3200, percentage: '5.3%', color: 'var(--chart-1)' },
];

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2.5 border border-slate-200 rounded-lg shadow-md">
        <p className="text-[11px] font-semibold text-slate-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-[11px]" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface WebsitePerformanceProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  selectedCity?: string;
  selectedPropertyIds?: string[];
  selectedBrand?: string;
}

export const getBrandDomain = (brand?: string) => {
  switch (brand) {
    case 'ESL':
    case 'Essential Student Living':
      return 'https://essentialstudentliving.com';
    case 'PSL':
    case 'Prestige Student Living':
      return 'https://prestigestudentliving.com';
    case 'HFS':
    case 'Homes for Students':
      return 'https://wearehomesforstudents.com';
    case 'USL':
    case 'Urban Student Life':
      return 'https://www.urbanstudentlife.com';
    case 'UVSL':
    case 'Universal Student Living':
      return 'https://www.universalstudentliving.com';
    case 'EVO':
    case 'EVO Student':
      return 'https://evostudent.com';
    case 'GradPad':
    case 'Gradpad London':
      return 'https://www.gradpadlondon.com';
    case 'UKSH':
    case 'UK Student Houses':
      return 'https://www.ukstudenthouses.com';
    default:
      return 'https://essentialstudentliving.com';
  }
};

export interface UserSourceItem {
  source: string;
  users: number;
  sessions?: number;
  newUsers?: number;
  avgSession: string;
  engagementRate: string;
}

export interface AIReferralItem {
  source: string;
  users: number;
  sessions?: number;
  avgSession: string;
  engagementRate: string;
  topLandingPage: string;
  hostName?: string;
}

export interface CountryViewItem {
  country: string;
  views: number;
  percentage: string;
}

export interface DeviceViewItem {
  device: string;
  views: number;
  percentage: string;
  color: string;
}

export default function WebsitePerformance({
  dateRange,
  onDateRangeChange,
  selectedCity = 'All',
  selectedPropertyIds = [],
  selectedBrand = 'All Brands',
}: WebsitePerformanceProps) {
  const [sourcePage, setSourcePage] = useState(1);
  const [trafficMode, setTrafficMode] = useState<'session' | 'firstUser'>('session');
  const [aiPage, setAiPage] = useState(1);
  const [countryRows, setCountryRows] = useState(5);
  const [deviceRows, setDeviceRows] = useState(5);
  const [tooltipContent, setTooltipContent] = useState<{ name: string; views: number; percentage: string } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

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

  const { data: PROPERTIES = [] } = trpc.properties.getAll.useQuery();

  const effectiveBrand = useMemo(() => {
    if (selectedBrand && selectedBrand !== 'All Brands') return selectedBrand;
    if (selectedPropertyIds && selectedPropertyIds.length > 0 && PROPERTIES.length > 0) {
      const firstProp = PROPERTIES.find((p: any) => selectedPropertyIds.includes(p.id));
      if (firstProp) return firstProp.brand;
    }
    return selectedBrand;
  }, [selectedBrand, selectedPropertyIds, PROPERTIES]);

  // Query website performance statistics dynamically from backend
  const { data: liveData } = trpc.analytics.getWebsitePerformance.useQuery({
    selectedCity,
    selectedPropertyIds,
    selectedBrand,
    dateRange: {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd'),
    }
  });

  const usersData = (liveData?.usersData ?? GA4_USERS_DATA) as Array<{ date: string; users: number; usersLastYear: number }>;
  const engagementData = (liveData?.engagementData ?? GA4_ENGAGEMENT_DATA) as Array<{ date: string; bounceRate: number; sessionDuration: number }>;
  const userSources = (liveData?.userSources ?? USER_SOURCES) as UserSourceItem[];
  const aiReferralData = (liveData?.aiReferralData ?? AI_REFERRAL_DATA) as AIReferralItem[];
  const usersByDay = (liveData?.usersByDay ?? USERS_BY_DAY) as Array<{ day: string; users: number }>;
  const viewsByCountry = (liveData?.viewsByCountry ?? VIEWS_BY_COUNTRY) as CountryViewItem[];
  const viewsByDevice = (liveData?.viewsByDevice ?? VIEWS_BY_DEVICE) as DeviceViewItem[];
  const firstUserAcquisition = (liveData?.firstUserAcquisition ?? []) as UserSourceItem[];

  const csvMetadata = {
    reportTitle: 'Website Performance',
    brand: selectedBrand,
    client: selectedCity,
    timeRange: `${format(dateRange.from, 'PP')} - ${format(dateRange.to, 'PP')}`
  };

  // Calculate aggregated metrics
  const metrics = useMemo(() => {
    const totalUsers = usersData.reduce((sum: number, d: { users: number }) => sum + d.users, 0);
    const avgBounceRate = (engagementData.reduce((sum: number, d: { bounceRate: number }) => sum + d.bounceRate, 0) / engagementData.length).toFixed(1);
    const avgSessionDuration = (engagementData.reduce((sum: number, d: { sessionDuration: number }) => sum + d.sessionDuration, 0) / engagementData.length).toFixed(1);
    const totalViews = viewsByCountry.reduce((sum: number, d: { views: number }) => sum + d.views, 0);
    const totalTraffic = userSources.reduce((sum: number, d: { users: number }) => sum + d.users, 0);

    return {
      totalUsers,
      avgBounceRate,
      avgSessionDuration,
      totalViews,
      totalTraffic,
    };
  }, [usersData, engagementData, viewsByCountry, userSources]);

  const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

  const maxViews = useMemo(() => {
    if (!viewsByCountry || viewsByCountry.length === 0) return 1;
    return Math.max(...viewsByCountry.map(c => c.views));
  }, [viewsByCountry]);

  const colorScale = scaleLinear<string>()
    .domain([0, maxViews > 10 ? maxViews * 0.1 : maxViews / 2, maxViews])
    .range(["#f1f5f9", "#94a3b8", "#0f172a"]); // Slate 100 -> Slate 400 -> Slate 900

  return (
    <div className="space-y-6">
      {/* Top Section: User trends chart on left, 2x2 cards on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Trends Chart (Left Column) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4.5 w-4.5 text-blue-650" />
            <h3 className="text-sm font-semibold text-slate-900">User Trends</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usersData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="users" stroke="var(--chart-1)" name="Total Users" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="usersLastYear" stroke="#94a3b8" name="Users (Previous Year)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Four Cards (Right Column) */}
        {/* Four Cards (Right Column) */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Views Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between w-full">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Views</h4>
              <Globe className="h-4.5 w-4.5 text-blue-600 shrink-0" />
            </div>
            <div className="mt-3">
              <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{metrics.totalViews.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1 leading-normal">Page views worldwide</p>
            </div>
          </div>

          {/* Total Traffic Card (Total Users) */}
          <div className="bg-white rounded-lg border border-slate-200 p-4.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between w-full">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</h4>
              <Users className="h-4.5 w-4.5 text-blue-600 shrink-0" />
            </div>
            <div className="mt-3">
              <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{metrics.totalTraffic.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1 leading-normal">Users from all sources</p>
            </div>
          </div>

          {/* Avg Session Duration Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between w-full">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Session Duration</h4>
              <TrendingUp className="h-4.5 w-4.5 text-green-600 shrink-0" />
            </div>
            <div className="mt-3">
              <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{metrics.avgSessionDuration}m</p>
              <p className="text-xs text-slate-400 mt-1 leading-normal">Minutes per session</p>
            </div>
          </div>

          {/* Bounce Rate Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between w-full">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bounce Rate</h4>
              <Activity className="h-4.5 w-4.5 text-red-600 shrink-0" />
            </div>
            <div className="mt-3">
              <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">{metrics.avgBounceRate}%</p>
              <p className="text-xs text-slate-400 mt-1 leading-normal">Average across period</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3 & 4. Traffic by Source and AI Traffic Overview */}
      <div className="grid grid-cols-1 gap-6">
        {/* User Source Table (Refined gap) */}
        <div className="h-full flex flex-col">
          <Card className="border-slate-100/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden h-full flex flex-col justify-start gap-0 py-0">
            <CardHeader className="p-5 pb-3">
              <div className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-blue-500" />
                  Traffic by Source
                </CardTitle>
                <div className="flex items-center bg-slate-50/80 p-0.5 rounded-lg border border-slate-100/60 shadow-sm">
                  <button
                    onClick={() => setTrafficMode('session')}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${trafficMode === 'session' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    Session Acquisition
                  </button>
                  <button
                    onClick={() => setTrafficMode('firstUser')}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${trafficMode === 'firstUser' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    First User Acquisition
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1">
              <div className="rounded-xl border border-slate-100 overflow-hidden mt-2">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/70">
                    <tr className="border-b border-slate-100 hover:bg-transparent">
                      <th className="text-left py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">
                        {trafficMode === 'session' ? 'Source/Medium' : 'First user source/medium'}
                      </th>
                      {trafficMode === 'session' ? (
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Sessions</th>
                      ) : (
                        <>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Total Users</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">New Users</th>
                        </>
                      )}
                      <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Avg Session Duration</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(trafficMode === 'session' ? userSources : firstUserAcquisition).slice((sourcePage - 1) * 10, sourcePage * 10).map((source, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-900 font-medium text-xs">{source.source}</td>
                        {trafficMode === 'session' ? (
                          <td className="py-2 px-3 text-right font-semibold text-slate-700">{source.sessions?.toLocaleString() || source.users.toLocaleString()}</td>
                        ) : (
                          <>
                            <td className="py-2 px-3 text-right font-semibold text-slate-700">{source.users.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-700">{source.newUsers?.toLocaleString() || 0}</td>
                          </>
                        )}
                        <td className="py-2 px-3 text-right text-slate-600 font-medium">{source.avgSession}</td>
                        <td className="py-2 px-3 text-right">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {source.engagementRate}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <TablePagination
                  currentPage={sourcePage}
                  totalItems={(trafficMode === 'session' ? userSources : firstUserAcquisition).length}
                  itemsPerPage={10}
                  onPageChange={setSourcePage}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Traffic Overview (Refined gap) */}
        <div className="h-full flex flex-col">
          <Card className="border-slate-100/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden h-full flex flex-col justify-start gap-0 py-0">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                  AI Traffic Overview
                </CardTitle>
                <div className="shrink-0">
                  <ExportButtonGroup
                    onExportJpeg={() => {}}
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1">
              <div className="rounded-xl border border-slate-100 overflow-hidden mt-2">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50/70">
                    <tr className="border-b border-slate-100 hover:bg-transparent">
                      <th className="text-left py-2 px-3 font-semibold text-slate-700 text-[11px]">Name</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700 text-[11px]">Landing Page</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px]">Sessions</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px]">Avg Session Duration</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px]">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiReferralData.slice((aiPage - 1) * 10, aiPage * 10).map((source, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
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
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-slate-600 shrink-0"
                                title="Copy full URL"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-700 font-mono">
                          {source.sessions?.toLocaleString() || source.users?.toLocaleString() || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                          {source.avgSession}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100/50">
                            {source.engagementRate}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <TablePagination
                  currentPage={aiPage}
                  totalItems={aiReferralData.length}
                  itemsPerPage={10}
                  onPageChange={setAiPage}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 6. Users by Day of Week (Refined chart height & gaps) */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Users by Day of Week</h3>
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

      {/* 6. Views by Country and Device */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views by Country */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4.5 w-4.5 text-blue-600 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900">Views by Country/Region</h3>
            </div>
            <RowSelectDropdown value={countryRows} onChange={setCountryRows} />
          </div>

          <div className="w-full h-[180px] mb-4 bg-slate-50 rounded border border-slate-100 overflow-hidden flex items-center justify-center relative">
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 60 }} width={400} height={200} style={{ width: "100%", height: "100%" }}>
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
                      // Try to find the country in our data (handling potential naming differences)
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
                            hover: { fill: dataItem ? "#64748b" : "#f1f5f9", outline: "none" }, // Only highlight if data exists
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
            <div className="absolute bottom-2 right-2 flex flex-col gap-1 shadow-sm rounded border border-slate-200 overflow-hidden bg-white/90 backdrop-blur scale-90 origin-bottom-right">
              <button
                onClick={handleZoomIn}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors border-b border-slate-100"
                title="Zoom In"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                title="Zoom Out"
              >
                <Minus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {viewsByCountry.slice(0, countryRows).map((item, idx) => (
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

        {/* Views by Device (Granular Breakdown) */}
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4.5 w-4.5 text-orange-655" />
              <h3 className="text-sm font-semibold text-slate-900">Views by Device</h3>
            </div>
            <RowSelectDropdown value={deviceRows} onChange={setDeviceRows} />
          </div>
          <div className="space-y-2.5">
            {viewsByDevice.slice(0, deviceRows).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-750 font-medium">{item.device}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: item.percentage,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 w-10 text-right">{item.percentage}</span>
                </div>
              </div>
            ))}
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
