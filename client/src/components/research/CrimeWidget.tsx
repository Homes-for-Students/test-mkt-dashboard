import React from 'react';
import { trpc } from '@/lib/trpc';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function CrimeWidget({ propertyId }: { propertyId?: string | null }) {
  const { data, isLoading, error } = trpc.research.getCrimeData.useQuery(
    { propertyId: propertyId || '' },
    {
      enabled: !!propertyId,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 60, // 1 hour
    }
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-rose-500" />
        <h4 className="font-semibold text-slate-800 text-sm sm:text-base">Local Crime</h4>
      </div>
      
      {!propertyId ? (
        <div className="text-sm text-slate-500 py-8 text-center">
          Please select a specific property to see local crime stats.
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          
          {error && (
            <div className="text-sm text-rose-500 bg-rose-50 p-3 rounded-lg">
              Unable to load crime data for this area.
            </div>
          )}

          {data && !error && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
               {Object.entries(data).sort((a: any, b: any) => b[1] - a[1]).map(([category, count]) => (
                 <div key={category} className="flex items-center justify-between text-sm border-b border-slate-50 pb-1 last:border-0">
                   <span className="text-slate-600 capitalize">{category.replace(/-/g, ' ')}</span>
                   <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full text-xs">{String(count)}</span>
                 </div>
               ))}
               {Object.keys(data).length === 0 && (
                 <div className="text-sm text-slate-500">No recent crimes reported nearby.</div>
               )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
