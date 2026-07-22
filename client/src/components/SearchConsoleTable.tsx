import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  ScanSearch
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TablePagination } from '@/components/ui/table-pagination';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { exportToCsv } from '@/lib/exportUtils';
import ExportButtonGroup from '@/components/ExportButtonGroup';

export interface SearchConsoleQuery {
  id: string;
  searchTerm: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  avgCpc: number;
  cost: number;
  trend: 'up' | 'down' | 'stable';
}

type SortKey = 'searchTerm' | 'impressions' | 'clicks' | 'ctr' | 'position' | 'avgCpc' | 'cost';
type SortOrder = 'asc' | 'desc';

interface SearchConsoleTableProps {
  limit?: number;
  showSearch?: boolean;
  compact?: boolean;
  selectedCity?: string;
  selectedPropertyIds?: string[];
  selectedBrand?: string;
  dateRange?: { from: Date; to: Date };
  csvMetadata?: any;
}

export default function SearchConsoleTable({
  limit,
  showSearch = true,
  compact = false,
  selectedCity = 'All',
  selectedPropertyIds = [],
  selectedBrand = 'All Brands',
  dateRange = { from: new Date(), to: new Date() },
  csvMetadata = {}
}: SearchConsoleTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('clicks');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = trpc.analytics.getSearchConsoleQueries.useQuery({
    selectedCity,
    selectedPropertyIds,
    selectedBrand,
    dateRange: {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd')
    }
  });

  const searchData = useMemo(() => {
    if (!data?.queries) return [];
    return data.queries.map((q: any, i: number) => ({
      id: `q-${i}`,
      searchTerm: q.query,
      impressions: q.impressions,
      clicks: q.clicks,
      ctr: q.ctr,
      position: q.position,
      avgCpc: 0,
      cost: 0,
      trend: 'stable' as const
    }));
  }, [data]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Sort and filter queries
  const allFilteredQueries = useMemo(() => {
    return searchData.filter((query: any) =>
      query.searchTerm.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a: any, b: any) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Numbers
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [searchTerm, sortKey, sortOrder, searchData]);

  const itemsPerPage = limit ?? 10;

  const processedQueries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return allFilteredQueries.slice(startIndex, startIndex + itemsPerPage);
  }, [allFilteredQueries, currentPage, itemsPerPage]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalImpressions = searchData.reduce((sum: number, q: any) => sum + q.impressions, 0);
    const totalClicks = searchData.reduce((sum: number, q: any) => sum + q.clicks, 0);
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgPosition = searchData.length > 0 ? searchData.reduce((sum: number, q: any) => sum + q.position, 0) / searchData.length : 0;

    return {
      totalImpressions,
      totalClicks,
      avgCtr,
      avgPosition
    };
  }, [searchData]);

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-blue-600 font-bold" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5 text-blue-600 font-bold" />;
  };

  const getTrendIcon = (trend: SearchConsoleQuery['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-rose-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <Card id="search-console-table-card" className="group/card border-slate-100/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden h-full flex flex-col justify-between relative bg-white">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <ScanSearch className="h-4.5 w-4.5 text-slate-800 shrink-0" />
                Google Search Console Queries
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 font-medium mt-1">
                Organic search performance directly from Google Search Console
              </CardDescription>
            </div>
            
            {/* Quick Stats Summary */}
            {!compact && (
              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs font-medium text-slate-500 bg-slate-50/60 p-2 rounded-xl border border-slate-100">
                <div className="px-2 py-0.5">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Clicks</span>
                  <strong className="text-slate-700 font-mono text-sm">{stats.totalClicks.toLocaleString()}</strong>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="px-2 py-0.5">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Impressions</span>
                  <strong className="text-slate-700 font-mono text-sm">{stats.totalImpressions.toLocaleString()}</strong>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="px-2 py-0.5">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Avg CTR</span>
                  <strong className="text-slate-700 font-mono text-sm">{stats.avgCtr.toFixed(2)}%</strong>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div className="px-2 py-0.5">
                  <span className="text-[10px] text-slate-400 block font-semibold uppercase">Avg Pos</span>
                  <strong className="text-slate-700 font-mono text-sm">{stats.avgPosition.toFixed(1)}</strong>
                </div>
              </div>
            )}
          </div>

        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 flex-1">
        <div className="flex flex-col sm:flex-row gap-3 mt-0 mb-4 items-center justify-between">
          {showSearch ? (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Filter search queries..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 bg-white"
              />
            </div>
          ) : (
            <div className="flex-1"></div>
          )}
          <div className="shrink-0">
            <ExportButtonGroup
              onExportJpeg={() => {}}
              onExportCsv={() => {
                exportToCsv(allFilteredQueries.map((item: any) => ({
                  'Search Query': item.searchTerm,
                  'Impressions': item.impressions,
                  'Clicks': item.clicks,
                  'CTR': `${item.ctr.toFixed(2)}%`,
                  'Avg Position': item.position.toFixed(1)
                })), 'Search-Console-Queries', csvMetadata)
              }}
              csvOnly={true}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead
                  className="text-left py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('searchTerm')}
                >
                  <div className="flex items-center">
                    Search Query
                    {sortKey === 'searchTerm' && (
                      sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('impressions')}
                >
                  <div className="flex items-center justify-end">
                    Impressions
                    {sortKey === 'impressions' && (
                      sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('clicks')}
                >
                  <div className="flex items-center justify-end">
                    Clicks
                    {sortKey === 'clicks' && (
                      sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('ctr')}
                >
                  <div className="flex items-center justify-end">
                    CTR
                    {sortKey === 'ctr' && (
                      sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('position')}
                >
                  <div className="flex items-center justify-end">
                    Avg. Position
                    {sortKey === 'position' && (
                      sortOrder === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-[13px] font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full" />
                      Loading page data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : processedQueries.length > 0 ? (
                processedQueries.map((query: any) => (
                  <TableRow
                    key={query.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell className="py-2.5 px-3 font-medium text-slate-900 text-[13px]">
                      {query.searchTerm.length > 50 ? query.searchTerm.substring(0, 50) + '...' : query.searchTerm}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right font-medium text-slate-700 font-mono text-[13px]">
                      {query.impressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right font-medium text-slate-700 font-mono text-[13px]">
                      {query.clicks.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right text-[13px]">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[13px] font-medium text-slate-600">
                        {query.ctr.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-right text-slate-600 font-medium text-[13px]">
                      {query.position.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-slate-400 text-[13px] font-medium">
                    No search terms found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex justify-end">
          <TablePagination
            currentPage={currentPage}
            totalItems={allFilteredQueries.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </CardContent>
    </Card>
  );
}
