import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Copy, Check, Trash2, X, Loader2, ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ShareDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPropertyIds: string[];
  selectedBrand?: string;
  dashboardView: string;
  dateRange: { from: Date; to: Date };
}

export default function ShareDashboardModal({
  isOpen,
  onClose,
  selectedPropertyIds,
  selectedBrand = 'All Brands',
  dashboardView,
  dateRange,
}: ShareDashboardModalProps) {
  const { data: PROPERTIES = [] } = trpc.properties.getAll.useQuery();
  const [displayName, setDisplayName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [isExpirationOpen, setIsExpirationOpen] = useState(false);
  const expirationDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expirationDropdownRef.current && !expirationDropdownRef.current.contains(event.target as Node)) {
        setIsExpirationOpen(false);
      }
    };

    if (isExpirationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpirationOpen]);

  useEffect(() => {
    if (isOpen) {
      setShareUrl(null);

      // Auto-detect client if all selected properties share the same client
      if (selectedPropertyIds.length > 0 && PROPERTIES.length > 0) {
        const selectedProps = PROPERTIES.filter(p => selectedPropertyIds.includes(p.id));
        const clients = Array.from(new Set(selectedProps.map((p: any) => p.client).filter(Boolean)));

        if (clients.length === 1 && clients[0]) {
          setDisplayName(`${clients[0]}`);
        } else {
          setDisplayName('');
        }
      } else {
        setDisplayName('');
      }
    }
  }, [isOpen, selectedPropertyIds, PROPERTIES]);

  const propertyNamesText = useMemo(() => {
    if (selectedPropertyIds.length === 0) return 'None selected';
    if (PROPERTIES.length > 0 && selectedPropertyIds.length === PROPERTIES.length) return 'All Properties';

    const names = selectedPropertyIds
      .map(id => PROPERTIES.find(p => p.id === id)?.name)
      .filter(Boolean);

    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} +${names.length - 3} more`;
  }, [selectedPropertyIds, PROPERTIES]);

  const createLinkMutation = trpc.sharing.createShareableLink.useMutation();
  const getLinksQuery = trpc.sharing.getMyShareableLinks.useQuery();

  const handleCreateLink = async () => {
    setAuthError(false);
    if (selectedPropertyIds.length === 0) {
      toast.error('Please select at least one property');
      return;
    }

    try {
      const result = await createLinkMutation.mutateAsync({
        selectedPropertyIds,
        selectedCity: selectedBrand, // We use selectedCity field for the brand
        dashboardView,
        dateFrom: dateRange.from.toISOString(),
        dateTo: dateRange.to.toISOString(),
        displayName: displayName || `Dashboard ${new Date().toLocaleDateString()}`,
        expiresInDays,
      });

      if (result.success) {
        setShareUrl(result.shareUrl);
        setDisplayName('');
        toast.success('Shareable link created successfully!');
        getLinksQuery.refetch();
      }
    } catch (error: any) {
      if (error?.data?.code === 'UNAUTHORIZED' || error?.message?.includes('UNAUTHORIZED') || error?.message?.includes('not authenticated')) {
        setAuthError(true);
        toast.error('Admin login required to create shareable links');
      } else {
        toast.error('Failed to create shareable link');
        console.error(error);
      }
    }
  };

  const handleCopyUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(url);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-xl">
        <DialogHeader>
          <DialogTitle>Share Dashboard</DialogTitle>
          <DialogDescription>
            Create a secure, shareable link to this dashboard view without requiring login.
          </DialogDescription>
        </DialogHeader>

        {/* Auth error banner */}
        {authError && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <span className="text-lg leading-none">🔒</span>
            <div>
              <p className="font-semibold">Admin authentication required</p>
              <p className="mt-0.5 text-amber-700">Shareable links can only be created by authenticated admins. Please ensure you are logged in with admin credentials and try again.</p>
            </div>
          </div>
        )}

        <div className="space-y-6 min-w-0">
          {/* Create New Link Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Create New Shareable Link</h3>

            <div className="space-y-3">
              {/* Display Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Link Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., London Portfolio Q2"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Link Expiration
                </label>
                <div className="relative" ref={expirationDropdownRef}>
                  <button
                    onClick={() => setIsExpirationOpen(!isExpirationOpen)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white text-left flex items-center justify-between hover:border-slate-300 transition-colors"
                  >
                    <span>
                      {expiresInDays === 7 ? '7 days' :
                        expiresInDays === 30 ? '30 days' :
                          expiresInDays === 90 ? '90 days' : '1 year'}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpirationOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpirationOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {[
                        { label: '7 days', value: 7 },
                        { label: '30 days', value: 30 },
                        { label: '90 days', value: 90 },
                        { label: '1 year', value: 365 },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setExpiresInDays(option.value);
                            setIsExpirationOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 ${expiresInDays === option.value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-700'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs text-slate-600 shadow-sm">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                  <span className="font-semibold text-slate-700">Report for:</span>
                </div>
                <div className="space-y-1.5 pt-1 min-w-0">
                  <div className="flex justify-between gap-2 min-w-0">
                    <span className="text-slate-400 shrink-0">Date Range:</span>
                    <span className="font-medium text-slate-800 text-right truncate min-w-0">{dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between gap-2 min-w-0">
                    <span className="text-slate-400 shrink-0">Brand:</span>
                    <span className="font-medium text-slate-800 text-right truncate min-w-0">{selectedBrand}</span>
                  </div>
                  <div className="flex justify-between gap-4 min-w-0">
                    <span className="text-slate-400 shrink-0">Property:</span>
                    <span className="font-medium text-slate-800 text-right truncate min-w-0 flex-1">
                      {propertyNamesText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <Button
                onClick={handleCreateLink}
                disabled={createLinkMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20 mt-4"
              >
                {createLinkMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Shareable Link'
                )}
              </Button>
            </div>
          </div>

          {/* Generated Link */}
          {shareUrl && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-3">Link Created!</h3>
              <div className="flex items-center gap-2 bg-white p-3 rounded border border-green-200 text-sm font-mono text-slate-700 w-full overflow-hidden">
                <span className="flex-1 min-w-0 truncate">{shareUrl}</span>
                <button
                  onClick={() => handleCopyUrl(shareUrl)}
                  className="p-2 hover:bg-slate-100 rounded transition-colors shrink-0"
                >
                  {copiedToken === shareUrl ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-slate-600" />
                  )}
                </button>
              </div>
              <p className="text-xs text-green-700 mt-2">
                Share this link with clients. They can view the dashboard without logging in.
              </p>
            </div>
          )}

          {/* Existing Links */}
          {!shareUrl && getLinksQuery.data?.links && getLinksQuery.data.links.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Your Shareable Links</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getLinksQuery.data.links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {link.displayName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {link.propertyCount} {link.propertyCount === 1 ? 'property' : 'properties'} • {link.accessCount} views
                        {link.expiresAt &&
                          ` • Expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => handleCopyUrl(link.shareUrl)}
                        className="p-2 hover:bg-slate-200 rounded transition-colors"
                        title="Copy link"
                      >
                        {copiedToken === link.shareUrl ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
