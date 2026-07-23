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
  Target,
  ArrowUpRight
} from 'lucide-react';
import { TablePagination } from '@/components/ui/table-pagination';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { exportToCsv } from '@/lib/exportUtils';
import ExportButtonGroup from '@/components/ExportButtonGroup';


type SortKey = 'spend' | 'clicks' | 'impressions' | 'conversions' | 'ctr' | 'cpc';
type SortOrder = 'asc' | 'desc';

interface GoogleAdsTableProps {
  limit?: number;
  showSearch?: boolean;
  compact?: boolean;
  selectedCity?: string;
  selectedPropertyIds?: string[];
  selectedBrand?: string;
  dateRange?: { from: Date; to: Date };
  csvMetadata?: any;
  hideHeader?: boolean;
}

export default function GoogleAdsTable({
  limit,
  showSearch = true,
  compact = false,
  selectedCity = 'All',
  selectedPropertyIds = [],
  selectedBrand = 'All Brands',
  dateRange = { from: new Date(), to: new Date() },
  csvMetadata = {},
  hideHeader = false
}: GoogleAdsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = limit ?? 10;

  const { data, isLoading } = trpc.analytics.getGoogleAdsSearchTerms.useQuery({
    selectedCity,
    selectedPropertyIds,
    selectedBrand,
    dateRange: {
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: format(dateRange.to, 'yyyy-MM-dd')
    }
  });

  const searchTerms = useMemo(() => {
    if (!data?.searchTerms) return [];
    return data.searchTerms;
  }, [data]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...searchTerms];

    if (searchTerm) {
      result = result.filter(c =>
        c.searchTerm.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    result.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [searchTerms, searchTerm, sortKey, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const currentData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const SortIcon = ({ column }: { column: SortKey }) => {
    return (
      <ArrowUpDown
        className={`ml-2 h-4 w-4 transition-colors ${sortKey === column ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
          }`}
      />
    );
  };

  const handleCsvExport = () => {
    exportToCsv(filteredAndSortedData.map(item => ({
      'Search Term': item.searchTerm,
      'Spend': `£${item.spend.toFixed(2)}`,
      'Clicks': item.clicks,
      'Impressions': item.impressions,
      'CTR': `${item.ctr.toFixed(2)}%`,
      'Avg CPC': `£${item.cpc.toFixed(2)}`
    })), 'Google-Ads-Search-Terms', csvMetadata);
  };

  return (
    <Card id="google-ads-table-card" className={hideHeader ? "group/card flex flex-col relative py-0 gap-0 border-none shadow-none" : "group/card border-slate-100/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl overflow-hidden h-full flex flex-col justify-between relative bg-white py-0 gap-0"}>
      {!hideHeader && (
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-start sm:items-center gap-2">
                <Target className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
                <span className="leading-tight">Google Ads Search Terms</span>
              </CardTitle>
              <div className="shrink-0 md:hidden">
                <ExportButtonGroup
                  onExportJpeg={() => { }}
                  onExportCsv={handleCsvExport}
                  csvOnly={true}
                />
              </div>
            </div>
            <CardDescription className="hidden sm:block text-xs text-slate-400 font-medium">
              Performance breakdown by active search term
            </CardDescription>
          </div>
        </CardHeader>
      )}
      <CardContent className="p-5 pt-0 flex-1">
        {!compact && showSearch && (
          <div className="flex flex-col md:flex-row gap-3 mt-0 mb-4 items-center justify-between">
            <div className="relative flex-grow max-w-sm w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Filter search terms..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 bg-white text-xs sm:text-sm placeholder:text-xs"
              />
            </div>
            <div className="hidden md:block shrink-0">
              <ExportButtonGroup
                onExportJpeg={() => { }}
                onExportCsv={handleCsvExport}
                csvOnly={true}
              />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead
                  className="text-left py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center">
                    Search Term
                  </div>
                </TableHead>
                <TableHead
                  className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('spend')}
                >
                  <div className="flex items-center justify-start">
                    Spend
                    {sortKey === 'spend' && (
                      sortOrder === 'asc' ? <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" /> : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                </TableHead>

                <TableHead
                  className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('clicks')}
                >
                  <div className="flex items-center justify-start">
                    Clicks
                    {sortKey === 'clicks' && (
                      sortOrder === 'asc' ? <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" /> : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('impressions')}
                >
                  <div className="flex items-center justify-start">
                    Impr.
                    {sortKey === 'impressions' && (
                      sortOrder === 'asc' ? <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" /> : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('ctr')}
                >
                  <div className="flex items-center justify-start">
                    CTR
                    {sortKey === 'ctr' && (
                      sortOrder === 'asc' ? <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" /> : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="text-right py-2 px-3 font-semibold text-slate-700 text-[11px] h-auto cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('cpc')}
                >
                  <div className="flex items-center justify-start">
                    Avg. CPC
                    {sortKey === 'cpc' && (
                      sortOrder === 'asc' ? <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" /> : <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-slate-400 text-xs font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-600 rounded-full" />
                      Loading search terms...
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 text-xs font-medium">
                    No search terms found
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((campaign) => (
                  <TableRow key={campaign.searchTerm} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 text-[13px]">
                        {campaign.searchTerm}
                      </div>
                    </TableCell>
                    <TableCell className="text-left py-2.5 px-3 text-[13px] text-slate-600 font-semibold">
                      £{campaign.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell className="text-left py-2.5 px-3 text-[13px] text-slate-600 font-semibold">
                      {campaign.clicks.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-left py-2.5 px-3 text-[13px] text-slate-600 font-semibold">
                      {campaign.impressions.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-left py-2.5 px-3 text-[13px] text-slate-600 font-semibold">
                      {campaign.ctr.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-left py-2.5 px-3 text-[13px] text-slate-600 font-semibold">
                      £{campaign.cpc.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-end">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredAndSortedData.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
