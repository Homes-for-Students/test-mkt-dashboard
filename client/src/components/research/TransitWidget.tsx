import React from 'react';
import { trpc } from '@/lib/trpc';
import { Bus, Loader2 } from 'lucide-react';

export default function TransitWidget({ propertyId }: { propertyId?: string | null }) {
  const { data, isLoading, error } = trpc.research.getBusDisruptions.useQuery(
    { propertyId: propertyId || '' },
    {
      enabled: !!propertyId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 60,
    }
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Bus className="w-5 h-5 text-amber-600" />
        <h4 className="font-semibold text-slate-800">Transit Disruptions</h4>
      </div>

      {!propertyId ? (
        <div className="text-sm text-slate-500 py-8 text-center">
          Please select a specific property to see local transport disruptions.
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              Transit API unavailable.
            </div>
          )}

          {data && !error && (
            <div className="space-y-3">
              <div className="text-sm text-slate-600 mb-2">
                Found <span className="font-bold text-slate-900">{data.count || 0}</span> local transport datasets.
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {data.results?.slice(0, 10).map((r: any, idx: number) => (
                  <div key={idx} className="text-xs p-2 bg-slate-50 rounded border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="font-medium text-slate-800 mb-0.5">{r.operatorName || 'Unknown Operator'}</div>
                    <div className="text-slate-500 truncate">{r.description || 'General transit update'}</div>
                  </div>
                ))}
                {data.results?.length === 0 && (
                  <div className="text-sm text-slate-500">No transit datasets in this immediate area.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
