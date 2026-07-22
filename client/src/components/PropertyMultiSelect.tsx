import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, X, Check, MapPin } from 'lucide-react';
import { trpc } from '@/lib/trpc';
interface PropertyMultiSelectProps {
  selectedPropertyIds: string[];
  onSelectionChange: (ids: string[]) => void;
  selectedCity?: string;
  onCityChange?: (city: string) => void;
  selectedBrand?: string;
}

export default function PropertyMultiSelect({
  selectedPropertyIds,
  onSelectionChange,
  selectedCity = 'All',
  onCityChange,
  selectedBrand = 'All Brands',
}: PropertyMultiSelectProps) {
  const { data: PROPERTIES = [] } = trpc.properties.getAll.useQuery();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCityOpen, setIsCityOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Get unique cities from properties filtered by brand
  const cities = useMemo(() => {
    let props = PROPERTIES;
    if (selectedBrand !== 'All Brands') {
      props = props.filter((p) => p.brand === selectedBrand);
    }
    const uniqueCities = Array.from(new Set(props.map((p) => p.city)));
    return ['All', ...uniqueCities.sort()];
  }, [PROPERTIES, selectedBrand]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityOpen(false);
      }
    };

    if (isOpen || isCityOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isCityOpen]);

  // Filter properties by city and brand
  const filteredProperties = useMemo(() => {
    let props = PROPERTIES;
    if (selectedBrand !== 'All Brands') {
      props = props.filter((p) => p.brand === selectedBrand);
    }
    if (selectedCity !== 'All') {
      props = props.filter((p) => p.city === selectedCity);
    }

    // Further filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      props = props.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.city.toLowerCase().includes(term)
      );
    }

    return props;
  }, [PROPERTIES, selectedCity, selectedBrand, searchTerm]);

  const selectedProperties = useMemo(() => {
    return PROPERTIES.filter((p) => selectedPropertyIds.includes(p.id));
  }, [PROPERTIES, selectedPropertyIds]);

  const handleToggleProperty = (propertyId: string) => {
    if (selectedPropertyIds.includes(propertyId)) {
      onSelectionChange(selectedPropertyIds.filter((id) => id !== propertyId));
    } else {
      onSelectionChange([...selectedPropertyIds, propertyId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPropertyIds.length === filteredProperties.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredProperties.map((p) => p.id));
    }
  };

  const handleRemoveProperty = (propertyId: string) => {
    onSelectionChange(selectedPropertyIds.filter((id) => id !== propertyId));
  };

  const cityLabel = selectedCity === 'All' ? 'City' : selectedCity;
  const cityActive = selectedCity !== 'All';

  return (
    <div className="flex gap-2 items-center flex-wrap">
      {/* Filter by City */}
      <div className="relative" ref={cityDropdownRef}>
        <button
          onClick={() => setIsCityOpen(!isCityOpen)}
          className={`flex items-center justify-between px-3 py-1 border rounded-lg hover:border-slate-300 transition-colors text-xs font-semibold h-7 min-w-max gap-1.5 ${
            cityActive
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <MapPin className={`h-3 w-3 ${cityActive ? 'text-blue-500' : 'text-slate-400'}`} />
          <span>{cityLabel}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ml-0.5 ${
              cityActive ? 'text-blue-400' : 'text-slate-400'
            } ${isCityOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* City Dropdown Menu */}
        {isCityOpen && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto w-44">
            {cities.map((city) => (
              <button
                key={city}
                onClick={() => {
                  onCityChange?.(city);
                  setIsCityOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
                  selectedCity === city
                    ? 'bg-blue-50 text-blue-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {selectedCity === city && <Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                <span className={selectedCity === city ? '' : 'ml-5'}>{city}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter by Property */}
      <div className="relative" ref={dropdownRef}>
        {/* Dropdown Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between px-3 py-1 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors text-xs font-semibold text-slate-700 h-7 min-w-max gap-1.5"
        >
          <span>Property</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full -left-16 sm:left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden flex flex-col min-w-[16rem] w-72 max-w-[calc(100vw-2rem)]">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-100">
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
            </div>

            {/* Select All Option */}
            <div className="p-1.5 border-b border-slate-100">
              <button
                onClick={handleSelectAll}
                className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors text-sm"
              >
                <div
                  className={`h-4 w-4 rounded border ${
                    selectedPropertyIds.length === filteredProperties.length && filteredProperties.length > 0
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-slate-300'
                  } flex items-center justify-center`}
                >
                  {selectedPropertyIds.length === filteredProperties.length && filteredProperties.length > 0 && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <span className="font-medium text-slate-700">
                  Select All ({filteredProperties.length})
                </span>
              </button>
            </div>

            {/* Property List */}
            <div className="overflow-y-auto flex-1">
              {filteredProperties.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  No properties found
                </div>
              ) : (
                filteredProperties.map((prop) => (
                  <button
                    key={prop.id}
                    onClick={() => handleToggleProperty(prop.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-b-0 text-sm"
                  >
                    <div
                      className={`h-4 w-4 rounded border ${
                        selectedPropertyIds.includes(prop.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-slate-300'
                      } flex items-center justify-center flex-shrink-0`}
                    >
                      {selectedPropertyIds.includes(prop.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {prop.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {prop.city}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Property Badges — inline, dismissible */}
      {selectedProperties.map((prop) => (
        <span
          key={prop.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-full text-[11px] font-medium text-blue-700 h-6"
        >
          {prop.name}
          <button
            onClick={() => handleRemoveProperty(prop.id)}
            className="ml-0.5 hover:text-blue-900 transition-colors"
            aria-label={`Remove ${prop.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {selectedProperties.length === 0 && (
        <span className="text-[11px] text-slate-400 italic whitespace-nowrap hidden sm:inline">
          All properties
        </span>
      )}
    </div>
  );
}
