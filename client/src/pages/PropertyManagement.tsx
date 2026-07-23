import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { trpc } from '../lib/trpc';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Plus, Edit2, Trash2, ChevronDown, Check, Settings2, Search, AlertTriangle, X, Filter, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

// Generic autocomplete combobox
function AutocompleteCombobox({
  value,
  onChange,
  existingItems,
  placeholder,
  itemName,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  existingItems: string[];
  placeholder: string;
  itemName: string;
  id: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    const term = inputVal.toLowerCase();
    return existingItems.filter((b) => b.toLowerCase().includes(term));
  }, [inputVal, existingItems]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputVal(v);
    onChange(v);
    setIsOpen(true);
  };

  const handleSelect = (brand: string) => {
    setInputVal(brand);
    onChange(brand);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Input
          id={id}
          value={inputVal}
          onChange={handleInput}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="placeholder:text-slate-400"
          required={id === 'brand'}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          onClick={() => setIsOpen((v) => !v)}
          tabIndex={-1}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
          {filtered.length === 0 && inputVal.trim() ? (
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 flex items-center gap-2"
              onClick={() => handleSelect(inputVal.trim())}
            >
              <Plus className="h-3.5 w-3.5 text-orange-500" />
              <span>Add new {itemName}: <strong className="text-slate-900">{inputVal.trim()}</strong></span>
            </button>
          ) : null}
          {filtered.map((item) => (
            <button
              type="button"
              key={item}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-orange-50 transition-colors ${item === value ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-700'
                }`}
              onClick={() => handleSelect(item)}
            >
              {item === value ? (
                <Check className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              ) : (
                <span className="w-3.5" />
              )}
              {item}
            </button>
          ))}
          {filtered.length === 0 && !inputVal.trim() && (
            <div className="px-4 py-3 text-sm text-slate-400">No {itemName}s yet. Type to add a new one.</div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline confirm dialog (avoids browser native confirm() clashing with shadcn Dialog)
function DeleteConfirmDialog({
  propName,
  onConfirm,
  onCancel,
}: {
  propName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: 'var(--title)' }}>
              Delete Property
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete <strong>{propName}</strong>? This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function getBrandBadgeClass(brand: string) {
  if (!brand) return 'brand-default';
  const slug = brand.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `brand-${slug}`;
}

export default function PropertyManagement() {
  const queryClient = useQueryClient();
  const { data: properties = [], isLoading } = trpc.properties.getAll.useQuery();

  const upsertBrandColor = trpc.brandColors.upsert.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['brandColors', 'getAll']] });
    }
  });

  const createProp = trpc.properties.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['properties', 'getAll']] });
      toast.success('Property created successfully');
      setIsOpen(false);
    },
  });
  const updateProp = trpc.properties.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['properties', 'getAll']] });
      toast.success('Property updated successfully');
      setIsOpen(false);
    },
  });
  const deleteProp = trpc.properties.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['properties', 'getAll']] });
      toast.success('Property deleted');
      setDeleteTarget(null);
    },
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    brandFullName: '',
    brandBackgroundColor: '#f58524',
    brandTextColor: '#ffffff',
    city: '',
    beds: 0,
    occupancyRate: 0,
    websiteUrl: '',
    googleBusinessProfileId: '',
    client: '',
  });

  const existingBrands = useMemo(() => {
    return Array.from(new Set(properties.map((p) => p.brand).filter(Boolean))).sort();
  }, [properties]);

  const existingClients = useMemo(() => {
    return Array.from(new Set(properties.map((p) => (p as any).client).filter(Boolean))).sort();
  }, [properties]);

  const existingCities = useMemo(() => {
    const targetProps = filterBrand ? properties.filter(p => p.brand === filterBrand) : properties;
    return Array.from(new Set(targetProps.map((p) => p.city))).sort();
  }, [properties, filterBrand]);

  const handleBrandFilterChange = (brand: string) => {
    setFilterBrand(brand);
    if (brand) {
      const brandCities = properties.filter((p) => p.brand === brand).map((p) => p.city);
      if (filterCity && !brandCities.includes(filterCity)) {
        setFilterCity('');
      }
    }
  };

  // Filter properties by search query and column filters
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // 1. text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) {
          return false;
        }
      }
      // 2. brand column filter
      if (filterBrand && p.brand !== filterBrand) return false;
      // 3. city column filter
      if (filterCity && p.city !== filterCity) return false;

      return true;
    });
  }, [properties, searchQuery, filterBrand, filterCity]);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      name: '',
      brand: '',
      brandFullName: '',
      brandBackgroundColor: '#f58524',
      brandTextColor: '#ffffff',
      city: '',
      beds: 0,
      occupancyRate: 0,
      websiteUrl: '',
      googleBusinessProfileId: '',
      client: '',
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setFormData({
      name: p.name,
      brand: p.brand,
      brandFullName: '',
      brandBackgroundColor: '#f58524',
      brandTextColor: '#ffffff',
      city: p.city,
      beds: p.beds,
      occupancyRate: p.occupancyRate,
      websiteUrl: p.websiteUrl || '',
      googleBusinessProfileId: p.googleBusinessProfileId || '',
      client: (p as any).client || '',
    });
    setEditingId(p.id);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if adding a brand new brand
    const isNewBrand = formData.brand && !existingBrands.includes(formData.brand);
    if (!editingId && isNewBrand) {
      try {
        await upsertBrandColor.mutateAsync({
          brand: formData.brand,
          fullName: formData.brandFullName,
          backgroundColor: formData.brandBackgroundColor,
          textColor: formData.brandTextColor,
        });
      } catch (err) {
        console.error("Failed to save brand colors", err);
      }
    }

    if (editingId) {
      updateProp.mutate({
        id: editingId,
        name: formData.name,
        brand: formData.brand,
        city: formData.city,
        websiteUrl: formData.websiteUrl || '',
        googleBusinessProfileId: formData.googleBusinessProfileId || '',
      });
    } else {
      createProp.mutate({
        name: formData.name,
        brand: formData.brand,
        city: formData.city,
        beds: 0,
        occupancyRate: 0,
        websiteUrl: formData.websiteUrl || '',
        googleBusinessProfileId: formData.googleBusinessProfileId || '',
      });
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-sm text-slate-500" style={{ fontFamily: 'var(--font)' }}>
        Loading properties...
      </div>
    );

  return (
    <>
      {/* Custom delete confirm — rendered outside Dialog to avoid modal conflicts */}
      {deleteTarget && (
        <DeleteConfirmDialog
          propName={deleteTarget.name}
          onConfirm={() => deleteProp.mutate({ id: deleteTarget.id })}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Admin settings-style header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div>
              <h2
                className="text-xl font-semibold text-slate-900 tracking-tight"
                style={{ fontFamily: 'var(--title)' }}
              >
                Brand &amp; Property Settings
              </h2>
              <p className="text-xs text-slate-400 mt-0.5" style={{ fontFamily: 'var(--font)' }}>
                {properties.length} properties · Admin only
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleOpenNew}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold h-8 px-3 rounded-lg shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Property
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'var(--title)' }}>
                    {editingId ? 'Edit Property' : 'Add New Property'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      htmlFor="name"
                      style={{ fontFamily: 'var(--font)' }}
                    >
                      Property Name
                    </label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Crown Place"
                      className="placeholder:text-slate-400"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <label
                      className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      htmlFor="brand"
                      style={{ fontFamily: 'var(--font)' }}
                    >
                      Brand
                    </label>
                    <AutocompleteCombobox
                      id="brand"
                      value={formData.brand}
                      onChange={(v) => setFormData({ ...formData, brand: v })}
                      existingItems={existingBrands}
                      placeholder="Type or select a brand..."
                      itemName="brand"
                    />
                  </div>

                  {!editingId && formData.brand && !existingBrands.includes(formData.brand) && (
                    <div className="flex flex-col gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg animate-fade-in">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                          Brand Full Name
                        </label>
                        <Input
                          value={formData.brandFullName}
                          onChange={(e) => setFormData({ ...formData, brandFullName: e.target.value })}
                          placeholder="e.g. Universal Student Living"
                          className="h-8 text-xs placeholder:text-slate-400"
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="space-y-1.5 flex-1">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Brand Background
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.brandBackgroundColor}
                              onChange={(e) => setFormData({ ...formData, brandBackgroundColor: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                            />
                            <Input
                              value={formData.brandBackgroundColor}
                              onChange={(e) => setFormData({ ...formData, brandBackgroundColor: e.target.value })}
                              className="flex-1 h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Brand Text
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.brandTextColor}
                              onChange={(e) => setFormData({ ...formData, brandTextColor: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                            />
                            <Input
                              value={formData.brandTextColor}
                              onChange={(e) => setFormData({ ...formData, brandTextColor: e.target.value })}
                              className="flex-1 h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      htmlFor="city"
                      style={{ fontFamily: 'var(--font)' }}
                    >
                      City
                    </label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Manchester"
                      className="placeholder:text-slate-400"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      htmlFor="client"
                      style={{ fontFamily: 'var(--font)' }}
                    >
                      Client
                    </label>
                    <AutocompleteCombobox
                      id="client"
                      value={formData.client}
                      onChange={(v) => setFormData({ ...formData, client: v })}
                      existingItems={existingClients}
                      placeholder="Type or select a client..."
                      itemName="client"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      htmlFor="websiteUrl"
                      style={{ fontFamily: 'var(--font)' }}
                    >
                      Website URL (For GA4 Data)
                    </label>
                    <Input
                      id="websiteUrl"
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="e.g. https://www.yourdomain.com/property"
                      className="placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      htmlFor="googleBusinessProfileId"
                      style={{ fontFamily: 'var(--font)' }}
                    >
                      Google Location ID (For Reviews/Calls)
                    </label>
                    <Input
                      id="googleBusinessProfileId"
                      value={formData.googleBusinessProfileId}
                      onChange={(e) => setFormData({ ...formData, googleBusinessProfileId: e.target.value })}
                      placeholder="e.g. accounts/123/locations/456"
                      className="placeholder:text-slate-400"
                    />
                  </div>

                  <div className="pt-3 flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createProp.isPending || updateProp.isPending}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {editingId ? 'Save Changes' : 'Create Property'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
          {/* Integrated Search Bar */}
          <div className="relative border-b border-slate-100 bg-slate-50/50 p-2 sm:p-3">
            <Search className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by property or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-10 py-2 text-sm bg-white border border-slate-200 focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 rounded-xl transition-all placeholder:text-slate-400"
              style={{ fontFamily: 'var(--font)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap" style={{ fontFamily: 'var(--font)' }}>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Property Name
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 hover:text-slate-800 transition-colors focus:outline-none">
                           BRAND
                          <Filter className={`h-3 w-3 ${filterBrand ? 'text-orange-500 fill-orange-500' : 'text-slate-400'}`} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 max-h-[300px] overflow-y-auto" style={{ fontFamily: 'var(--font)' }}>
                        <DropdownMenuItem
                          onClick={() => handleBrandFilterChange('')}
                          className={!filterBrand ? 'font-bold text-orange-600 bg-orange-50/50' : ''}
                        >
                          All Brands
                        </DropdownMenuItem>
                        {existingBrands.map((b) => (
                          <DropdownMenuItem
                            key={b}
                            onClick={() => handleBrandFilterChange(b)}
                            className={filterBrand === b ? 'font-bold text-orange-600 bg-orange-50/50' : ''}
                          >
                            {b}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 hover:text-slate-800 transition-colors focus:outline-none">
                          CITY
                          <Filter className={`h-3 w-3 ${filterCity ? 'text-orange-500 fill-orange-500' : 'text-slate-400'}`} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 max-h-[300px] overflow-y-auto" style={{ fontFamily: 'var(--font)' }}>
                        <DropdownMenuItem
                          onClick={() => setFilterCity('')}
                          className={!filterCity ? 'font-bold text-orange-600 bg-orange-50/50' : ''}
                        >
                          All Cities
                        </DropdownMenuItem>
                        {existingCities.map((c) => (
                          <DropdownMenuItem
                            key={c}
                            onClick={() => setFilterCity(c)}
                            className={filterCity === c ? 'font-bold text-orange-600 bg-orange-50/50' : ''}
                          >
                            {c}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">
                    Client
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProperties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-3 font-medium text-slate-800 text-sm">{prop.name}</td>
                    <td className="px-6 py-3">
                      <span className={`brand-badge ${getBrandBadgeClass(prop.brand)}`}>
                        {prop.brand}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{prop.city}</td>
                    <td className="px-6 py-3 text-slate-500">{(prop as any).client || '-'}</td>
                    <td className="px-6 py-3 text-left">
                      <div className="flex items-center justify-start gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-slate-100 hover:text-slate-900 text-slate-400"
                          onClick={() => handleOpenEdit(prop)}
                          title="Edit property"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400"
                          onClick={() => setDeleteTarget({ id: prop.id, name: prop.name })}
                          title="Delete property"
                          disabled={deleteProp.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProperties.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-10 py-12 text-center text-sm text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center mb-1">
                          <Search className="h-5 w-5 text-slate-300" />
                        </div>
                        <p>{searchQuery ? `No properties match "${searchQuery}"` : 'No properties yet.'}</p>
                        {!searchQuery && (
                          <Button variant="link" className="text-orange-500 h-auto p-0" onClick={handleOpenNew}>
                            Click here to add your first property
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
