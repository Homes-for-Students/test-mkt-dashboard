import { format } from 'date-fns';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, Laptop, Users, Globe, ArrowUpRight, TrendingUp, Activity, MousePointer2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ExportButtonGroup from '@/components/ExportButtonGroup';
import { exportToJpeg, exportToCsv } from '@/lib/exportUtils';
import { trpc } from '@/lib/trpc';
import {
  GA4_USERS_DATA,
  GA4_ENGAGEMENT_DATA,
  USER_SOURCES,
  VIEWS_BY_COUNTRY
} from './WebsitePerformance';

import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

function SectionHelp({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <UITooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none shrink-0">
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

interface WebsiteSnapshotProps {
  selectedCity?: string;
  selectedPropertyIds?: string[];
  selectedBrand?: string;
  dateRange?: { from: Date; to: Date };
  compact?: boolean;
  csvMetadata?: any;
}

export default function WebsiteSnapshot({
  selectedCity = 'All',
  selectedPropertyIds = [],
  selectedBrand = 'All Brands',
  dateRange = { from: new Date(), to: new Date() },
  compact = false,
  csvMetadata = {}
}: WebsiteSnapshotProps) {
  const { data, isLoading } = trpc.analytics.getWebsitePerformance.useQuery({
    selectedCity,
    selectedPropertyIds,
    selectedBrand,
    dateRange: {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd')
    }
  });
  const usersData = (data?.usersData ?? GA4_USERS_DATA) as Array<{ date: string; users: number; usersLastYear: number }>;
  const engagementData = (data?.engagementData ?? GA4_ENGAGEMENT_DATA) as Array<{ date: string; bounceRate: number; sessionDuration: number }>;
  const userSources = (data?.userSources ?? USER_SOURCES) as Array<any>;
  const viewsByCountry = (data?.viewsByCountry ?? VIEWS_BY_COUNTRY) as Array<any>;

  const metrics = React.useMemo(() => {
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

  return (
    <Card id="website-snapshot-card" className="group/card border-slate-100/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden h-full flex flex-col justify-between relative bg-white py-0 gap-0">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight flex items-start sm:items-center gap-2">
              <Laptop className="h-4.5 w-4.5 text-slate-800 shrink-0 mt-0.5 sm:mt-0" />
              <span className="leading-tight">Website Activity</span>
              <SectionHelp text="See how many people visited your site, how long they stayed, and how they found you. Updates daily." />
            </CardTitle>
            <div className="shrink-0 -mt-1 -mr-1">
              <ExportButtonGroup
                onExportJpeg={() => exportToJpeg('website-snapshot-card', 'Website-Snapshot')}
                onExportCsv={() => {
                  const csvData = usersData.map(d => ({
                    'Date': d.date,
                    'Users': d.users
                  }));

                  const extendedMetadata = {
                    ...csvMetadata,
                    summaryStats: {
                      'Total Users': metrics.totalUsers,
                      'Views': metrics.totalViews,
                      'Avg Session (m)': metrics.avgSessionDuration,
                      'Bounce Rate (%)': metrics.avgBounceRate
                    }
                  };

                  exportToCsv(csvData, 'Website-Snapshot', extendedMetadata);
                }}
              />
            </div>
          </div>
          <CardDescription className="hidden sm:block text-xs text-slate-400 font-medium">
            Real-time GA4 engagement indicators and traffic highlights
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0 flex-1 flex flex-col justify-start gap-4">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 h-full py-8">
            <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full" />
            <span className="text-xs font-medium">Loading GA4 data...</span>
          </div>
        ) : metrics.totalViews === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-1 h-full py-8 text-center">
            <Globe className="h-6 w-6 text-slate-300 mb-1" />
            <span className="text-xs font-semibold text-slate-500">No Website Traffic Data</span>
            <span className="text-[10px] max-w-[200px]">Ensure GA4 mapping is correct and has active tracking data.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4 h-full">
            {/* Top side: Responsive grid (2x2 on mobile, 4x1 on md, 2x2 on xl when side-by-side) */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-3 mb-4">
              {/* Total Users */}
              <div className="flex flex-col justify-center px-3 py-2.5 bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate mr-1" title="Total Users">Total Users</h4>
                  <Users className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                </div>
                <p className="text-base font-bold text-slate-900 leading-none truncate">{metrics.totalTraffic.toLocaleString()}</p>
              </div>

              {/* Total Views */}
              <div className="flex flex-col justify-center px-3 py-2.5 bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate mr-1" title="Total Views">Total Views</h4>
                  <Eye className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                </div>
                <p className="text-base font-bold text-slate-900 leading-none truncate">{metrics.totalViews.toLocaleString()}</p>
              </div>

              {/* Avg Session Duration */}
              <div className="flex flex-col justify-center px-3 py-2.5 bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate mr-1" title="Avg Session">Avg Session</h4>
                  <MousePointer2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                </div>
                <p className="text-base font-bold text-slate-900 leading-none truncate">{metrics.avgSessionDuration}m</p>
              </div>

              {/* Bounce Rate */}
              <div className="flex flex-col justify-center px-3 py-2.5 bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate mr-1" title="Bounce Rate">Bounce Rate</h4>
                  <Activity className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                </div>
                <p className="text-base font-bold text-slate-900 leading-none truncate">{metrics.avgBounceRate}%</p>
              </div>
            </div>

            {/* Bottom side: Line Chart */}
            <div className="flex flex-col min-h-[180px] border border-slate-100 rounded-xl p-4 bg-slate-50/30">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                Traffic Trend
              </h4>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usersData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="users" stroke="var(--chart-1)" name="Users" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
