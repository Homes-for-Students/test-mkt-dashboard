import React, { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Copy, Trash2, Calendar, Eye, Link as LinkIcon, Lock, Clock, ShieldX, Building2, ShieldCheck, X, Globe, User, ChevronDown, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ShareableLinksTab() {
  const { user, isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newExpireDays, setNewExpireDays] = useState('30');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [accessDialogId, setAccessDialogId] = useState<number | null>(null);
  const [domainInput, setDomainInput] = useState('');

  // Fetch user's shareable links
  const { data: linksData, isLoading, refetch } = trpc.sharing.getMyShareableLinks.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Delete link mutation
  const deleteLink = trpc.sharing.deleteShareableLink.useMutation({
    onSuccess: () => {
      toast.success('Link deleted successfully');
      setDeleteConfirmId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete link: ${error.message}`);
    },
  });

  // Update link access mutation
  const updateAccess = trpc.sharing.updateLinkAccess.useMutation({
    onSuccess: () => {
      toast.success('Access settings updated');
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update access: ${error.message}`);
    },
  });

  // Filter links based on search term
  const filteredLinks = useMemo(() => {
    if (!linksData?.links) return [];
    return linksData.links.filter((link) =>
      link.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      link.selectedCity?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [linksData?.links, searchTerm]);

  const handleCopyLink = (token: string) => {
    const fullUrl = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Link copied to clipboard!');
  };

  const handleAddDomain = (link: any, inputVal: string) => {
    if (!inputVal) return;
    const cleanVal = inputVal.trim().toLowerCase();
    
    // Require either a specific email (user@client.com) or an explicit domain (@client.com)
    const isSpecificEmail = cleanVal.includes('@') && cleanVal.split('@')[0].length > 0;
    const isDomain = cleanVal.startsWith('@') && cleanVal.length > 1;

    // Exception for internal domain logic
    const isInternal = cleanVal === 'wearehomesforstudents.com';

    if (!isSpecificEmail && !isDomain && !isInternal) {
      toast.error("Please explicitly enter an email (user@domain.com) or a domain (@domain.com)");
      return;
    }

    let entryToSave = cleanVal;
    if (isDomain) {
      entryToSave = cleanVal.substring(1); // strip leading @ for backend storage
    }

    const current = link.allowedDomains || [];
    if (current.includes(entryToSave)) {
      setDomainInput('');
      return;
    }
    
    updateAccess.mutate({ tokenId: link.id, allowedDomains: [...current, entryToSave] });
    setDomainInput('');
  };

  const handleRemoveDomain = (link: any, domain: string) => {
    const current = link.allowedDomains || [];
    updateAccess.mutate({ tokenId: link.id, allowedDomains: current.filter((d: string) => d !== domain) });
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteLink.mutate({ tokenId: deleteConfirmId });
    }
  };

  const isExpired = (expiresAt: Date | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getExpirationStatus = (expiresAt: Date | null) => {
    if (!expiresAt) return { label: 'Never', color: 'text-slate-500' };
    if (isExpired(expiresAt)) return { label: 'Expired', color: 'text-red-600' };
    const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) return { label: `${daysLeft}d left`, color: 'text-orange-600' };
    return { label: `${daysLeft}d left`, color: 'text-green-600' };
  };

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex gap-3">
        <Input
          placeholder="Search by name or brand..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm h-9 text-sm bg-white text-gray-600 placeholder:text-gray-400 "
        />
      </div>

      {/* Links Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500 text-sm">Loading shared links...</div>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 w-full">
          {/* Subtle Icon Area */}
          <div className="h-14 w-14 sm:h-16 sm:w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-sm border border-slate-100/60 ring-4 ring-slate-50/50">
            <LinkIcon className="h-6 w-6 sm:h-7 sm:w-7 text-slate-400" />
          </div>

          {/* Main Messaging */}
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 tracking-tight">No shared links created yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md text-center mb-5 sm:mb-8 leading-relaxed">
            Collaborate securely. Create a shareable link using the <strong className="font-semibold text-slate-700">"Share"</strong> button in the top right header to get started.
          </p>

          {/* Feature Highlights - Tighter Grid Layout */}
          <div className="w-full max-w-4xl border-t border-slate-100 pt-5 sm:pt-6 mt-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
              <div className="flex flex-col items-center text-center group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 sm:mb-3 border border-slate-100 group-hover:bg-emerald-50 group-hover:border-emerald-100 group-hover:text-emerald-600 transition-colors text-slate-400">
                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 mb-1 sm:mb-2">Secure Presets</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed px-1 sm:px-2 hidden sm:block">Locks your active brand and properties filters for the viewer.</p>
              </div>

              <div className="flex flex-col items-center text-center group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 sm:mb-3 border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-colors text-slate-400">
                  <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 mb-1 sm:mb-2">Read-Only</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed px-1 sm:px-2 hidden sm:block">Viewers can drill down into metrics, but cannot change your data.</p>
              </div>

              <div className="flex flex-col items-center text-center group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 sm:mb-3 border border-slate-100 group-hover:bg-orange-50 group-hover:border-orange-100 group-hover:text-orange-600 transition-colors text-slate-400">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 mb-1 sm:mb-2">Auto-Expiring</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed px-1 sm:px-2 hidden sm:block">Links automatically revoke public access after your chosen timeframe.</p>
              </div>

              <div className="flex flex-col items-center text-center group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2 sm:mb-3 border border-slate-100 group-hover:bg-rose-50 group-hover:border-rose-100 group-hover:text-rose-600 transition-colors text-slate-400">
                  <ShieldX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 mb-1 sm:mb-2">Instant Revoke</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed px-1 sm:px-2 hidden sm:block">Delete any active link instantly to block all future access.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredLinks.map((link) => {
            const expStatus = getExpirationStatus(link.expiresAt);
            const isExpiredLink = isExpired(link.expiresAt);

            return (
              <div
                key={link.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-sm"
              >
                <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-0 sm:pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {link.displayName}
                    </h3>
                    {isExpiredLink && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 rounded-full">
                        EXPIRED
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {link.selectedCity || 'All Brands'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> <span className={expStatus.color}>{expStatus.label}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {link.accessCount || 0} {link.accessCount === 1 ? 'view' : 'views'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Created {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(link.token)}
                    className="h-8 text-xs font-medium bg-white"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    Copy Link
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAccessDialogId(link.id)}
                    className="h-8 text-xs font-medium bg-white"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-slate-600" />
                    Manage Access
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConfirmId(link.id)}
                    className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 bg-white"
                    title="Delete Link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shared Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this shared link? Anyone with this link will instantly lose access. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteLink.isPending}>
              {deleteLink.isPending ? 'Deleting...' : 'Delete Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Access Management Modal (Google Docs Style) */}
      {(() => {
        const activeLink = filteredLinks.find(l => l.id === accessDialogId);
        if (!activeLink) return null;
        
        const INTERNAL_DOMAIN = 'wearehomesforstudents.com';
        const externalAccessList = (activeLink.allowedDomains || []).filter((d: string) => d !== INTERNAL_DOMAIN);
        const hasInternalAccess = (activeLink.allowedDomains || []).includes(INTERNAL_DOMAIN);

        return (
          <Dialog open={accessDialogId !== null} onOpenChange={(open) => !open && setAccessDialogId(null)}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[480px] p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-2xl mx-auto">
              <div className="p-5 pb-4">
                <h2 className="text-lg font-normal text-slate-900 mb-4">Share "{activeLink.displayName}"</h2>

                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Email (name@domain.com) or Domain (@domain.com)"
                    className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-slate-300 text-sm"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDomain(activeLink, domainInput);
                    }}
                  />
                  <Button
                    onClick={() => handleAddDomain(activeLink, domainInput)}
                    disabled={!domainInput.trim()}
                  >
                    Share
                  </Button>
                </div>
              </div>

              <div className="px-5 py-2 max-h-[240px] overflow-y-auto">
                <h3 className="text-sm font-medium text-slate-900 mb-3">External Guests</h3>

                <div className="space-y-3">
                  {externalAccessList.length > 0 ? (
                    externalAccessList.map((entry: string) => {
                      const isEmail = entry.includes('@');
                      return (
                        <div key={entry} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                              {isEmail ? <User className="h-4 w-4 text-slate-600" /> : <Globe className="h-4 w-4 text-slate-600" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">{isEmail ? entry : `@${entry}`}</span>
                              <span className="text-xs text-slate-500">{isEmail ? 'Viewer' : 'Viewers at this domain'}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveDomain(activeLink, entry)}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-slate-500 italic py-2">No external guests have been granted access.</div>
                  )}
                </div>
              </div>

              <div className="mt-2 bg-slate-50/80 p-5 border-t border-slate-100">
                <h3 className="text-sm font-medium text-slate-900 mb-3">General Access</h3>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    {hasInternalAccess ? <Building2 className="h-4 w-4 text-slate-600" /> : <Lock className="h-4 w-4 text-slate-600" />}
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-sm font-medium text-slate-900">{hasInternalAccess ? 'HFS Internal' : 'Restricted'}</span>
                    <span className="text-xs text-slate-600">
                      {hasInternalAccess 
                        ? 'Anyone at Homes for Students can view this link.'
                        : 'Only invited external guests can view this link.'}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-slate-900 bg-slate-200/50"
                      >
                        {hasInternalAccess ? 'HFS Internal' : 'Restricted'}
                        <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem 
                        onClick={() => {
                          if (hasInternalAccess) handleRemoveDomain(activeLink, INTERNAL_DOMAIN);
                        }}
                        className="flex items-center justify-between py-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-slate-500" /> 
                          <div className="flex flex-col">
                            <span className="font-medium">Restricted</span>
                            <span className="text-[10px] text-slate-500">Only invited guests</span>
                          </div>
                        </div>
                        {!hasInternalAccess && <Check className="h-4 w-4 text-emerald-600" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          if (!hasInternalAccess) handleAddDomain(activeLink, INTERNAL_DOMAIN);
                        }}
                        className="flex items-center justify-between py-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-500" /> 
                          <div className="flex flex-col">
                            <span className="font-medium">HFS Internal</span>
                            <span className="text-[10px] text-slate-500">All HFS employees</span>
                          </div>
                        </div>
                        {hasInternalAccess && <Check className="h-4 w-4 text-emerald-600" />}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between bg-white border-t border-slate-100">
                <Button
                  variant="outline"
                  className="rounded-full text-slate-600 border-slate-300 h-9"
                  onClick={() => handleCopyLink(activeLink.token)}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Copy link
                </Button>
                <Button
                  className="rounded-full h-9 px-6"
                  onClick={() => setAccessDialogId(null)}
                >
                  Done
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
