import React from 'react';
import { trpc } from '@/lib/trpc';
import { Users, Loader2, House } from 'lucide-react';

export default function CompetitorPricingWidget({ propertyId, city }: { propertyId?: string | null; city?: string | null }) {
  const { data, isLoading, error } = trpc.research.getCompetitors.useQuery(
    { 
      propertyId: propertyId || undefined, 
      city: city || undefined 
    }, 
    {
      enabled: !!propertyId || !!city,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 60,
    }
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <House className="w-5 h-5 text-slate-700" />
        <h4 className="font-semibold text-slate-800">Local Competitors</h4>
      </div>

      {(!propertyId && !city) ? (
        <div className="text-sm text-slate-500 py-8 text-center">
          Please select a city or property to see local competitors.
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-sm text-indigo-600 bg-indigo-50 p-3 rounded-lg">
              Failed to fetch competitor data.
            </div>
          )}

      {data && !error && (
        <div className="space-y-3">
          <div className="grid grid-cols-12 text-[11px] text-slate-400 uppercase font-semibold tracking-wider pb-1 border-b border-slate-100 px-1">
            <span className="col-span-4 pl-2 ">Accommodation</span>
            <span className="col-span-4">Incentive</span>
            <span className="col-span-4 text-center">From Price</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {data.map((c: any) => (
              <div key={c.id} className="grid grid-cols-12 items-center text-sm py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-1 -mx-1 rounded transition-colors gap-2">
                <div className="col-span-4 truncate pl-2">
                  <div className="font-medium text-slate-800 truncate" title={c.name}>{c.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{c.landlord || c.city}</div>
                </div>
                <div className="col-span-4 text-xs text-left text-slate-600 font-medium break-words leading-tight whitespace-normal">
                  {c.incentive || '-'}
                </div>
                <div className="col-span-4 text-center font-semibold text-slate-700">
                  {c.minimumPrice ? `£${c.minimumPrice}/pw` : 'N/A'}
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-4">No competitors found in this city.</div>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
