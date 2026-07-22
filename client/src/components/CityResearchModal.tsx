import React from 'react';
import { MapPin, X } from 'lucide-react';
import CrimeWidget from './research/CrimeWidget';
import TransitWidget from './research/TransitWidget';
import CompetitorPricingWidget from './research/CompetitorPricingWidget';

import { trpc } from '@/lib/trpc';

interface CityResearchModalProps {
  propertyId?: string | null;
  city?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CityResearchModal({ propertyId, city, isOpen, onClose }: CityResearchModalProps) {
  const { data: properties = [] } = trpc.properties.getAll.useQuery();
  const property = propertyId ? properties.find(p => p.id === propertyId) : null;
  const cityName = property?.city || city || '';

  const [lastChecked, setLastChecked] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-lg">
                  City Research {cityName ? `for ${cityName}` : ''}
                </h3>
                {lastChecked && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
                    Last updated: {lastChecked}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">Live data matching the property's exact location and city</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto bg-slate-50/50 custom-scrollbar flex-1">
          {/* First Row: Transit & Crime */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <TransitWidget propertyId={propertyId} />
            <CrimeWidget propertyId={propertyId} />
          </div>
          {/* Second Row: Competitors */}
          <div className="grid grid-cols-1">
            <CompetitorPricingWidget propertyId={propertyId} city={cityName} />
          </div>
        </div>
      </div>
    </div>
  );
}
