import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/layout/header";
import MobileHeader from "@/components/layout/mobile-header";
import { useToast } from "@/hooks/use-toast";

export default function ShopOwnerSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const { toast } = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search wholesalers with balance
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['/api/shop-owner/wholesalers/search', debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery.trim()) return [];
      const response = await fetch(`/api/shop-owner/wholesalers/search?q=${encodeURIComponent(debouncedSearchQuery.trim())}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to search wholesalers');
      return response.json();
    },
    enabled: !!debouncedSearchQuery.trim(),
    staleTime: 30000 // Cache for 30 seconds
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>

      {/* Mobile Header */}
      <div className="block lg:hidden">
        <MobileHeader />
      </div>

      {/* Main Content */}
      <div className="pt-16 lg:pt-24 pb-20 lg:pb-8">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Search Wholesalers</h1>
            <p className="text-muted-foreground">Find wholesalers and view your balance relationship</p>
          </div>

          {/* Search Input */}
          <div className="mb-6">
            <Label htmlFor="search-input" className="text-base font-medium">
              Search by name, email, or phone number
            </Label>
            <Input
              id="search-input"
              type="text"
              placeholder="Enter wholesaler name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
              data-testid="input-search-wholesalers"
            />
          </div>

          {/* Search Results */}
          {debouncedSearchQuery.trim() && (
            <div>
              {isSearching ? (
                <div className="text-center py-8" data-testid="loading-search-results">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Searching wholesalers...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {searchResults.map((wholesaler: any) => (
                    <Card 
                      key={wholesaler.id}
                      className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500"
                      data-testid={`card-counterparty-${wholesaler.id}`}
                    >
                      <CardContent className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <i className="fas fa-warehouse text-green-600"></i>
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground text-lg" data-testid={`text-name-${wholesaler.id}`}>
                                {wholesaler.name}
                              </h3>
                              <p className="text-sm text-green-600 font-medium">Wholesaler</p>
                              <p className="text-xs text-muted-foreground">ID: {wholesaler.id.slice(-8)}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Contact Details */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <i className="fas fa-envelope mr-3 w-4"></i>
                            <span data-testid={`text-email-${wholesaler.id}`}>{wholesaler.email}</span>
                          </div>
                          {wholesaler.phone && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <i className="fas fa-phone mr-3 w-4"></i>
                              <span data-testid={`text-phone-${wholesaler.id}`}>{wholesaler.phone}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Balance Information */}
                        <div className="bg-muted/50 rounded-lg p-4">
                          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <i className="fas fa-chart-line"></i>
                            Balance Overview
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Current Balance:</span>
                              <span className={`font-semibold ${
                                wholesaler.currentBalance > 0 ? 'text-red-600' : 
                                wholesaler.currentBalance < 0 ? 'text-green-600' : 'text-muted-foreground'
                              }`} data-testid={`text-balance-${wholesaler.id}`}>
                                ₹{Math.abs(wholesaler.currentBalance).toFixed(2)}
                                {wholesaler.currentBalance > 0 ? ' (You owe)' : 
                                 wholesaler.currentBalance < 0 ? ' (You are owed)' : ' (Settled)'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Total Transactions:</span>
                              <span className="text-sm font-medium" data-testid={`text-transactions-${wholesaler.id}`}>
                                {wholesaler.totalTransactions}
                              </span>
                            </div>
                            {wholesaler.lastTxnAt && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Last Transaction:</span>
                                <span className="text-sm" data-testid={`text-last-transaction-${wholesaler.id}`}>
                                  {new Date(wholesaler.lastTxnAt).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-search-results">
                  <i className="fas fa-search text-4xl text-muted-foreground mb-4"></i>
                  <p className="text-muted-foreground">No wholesalers found matching "{debouncedSearchQuery}"</p>
                  <p className="text-sm text-muted-foreground mt-2">Try searching with a different name, email, or phone number</p>
                </div>
              )}
            </div>
          )}

          {/* Initial State - No Search */}
          {!debouncedSearchQuery.trim() && (
            <div className="text-center py-12" data-testid="search-initial-state">
              <i className="fas fa-search text-6xl text-muted-foreground mb-6"></i>
              <h3 className="text-xl font-semibold text-foreground mb-2">Search for Wholesalers</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start typing in the search box above to find wholesalers and view your balance relationship with them.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}