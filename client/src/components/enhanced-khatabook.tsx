import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function EnhancedKhatabook() {
  const [selectedShopOwner, setSelectedShopOwner] = useState<string | null>(null);
  const [showAllBalances, setShowAllBalances] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Fetch individual shop owner balances
  const { data: balanceData, isLoading } = useQuery({
    queryKey: ['/api/retailer/shop-owner-balances'],
    queryFn: async () => {
      const response = await fetch('/api/retailer/shop-owner-balances', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch shop owner balances');
      return response.json();
    }
  });

  const allShopOwnerBalances = balanceData?.shopOwnerBalances || [];
  // Sort by current balance (highest first) and show top 5 unless showing all
  const sortedBalances = allShopOwnerBalances.sort((a: any, b: any) => b.currentBalance - a.currentBalance);
  const shopOwnerBalances = showAllBalances ? sortedBalances : sortedBalances.slice(0, 5);
  const totals = balanceData?.totals || { currentBalance: 0, totalCredits: 0, totalDebits: 0 };

  const selectedShopOwnerData = shopOwnerBalances.find(
    (balance: any) => balance.shopOwnerId === selectedShopOwner
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Khatabook - Individual Balances</h2>
        <p className="text-muted-foreground">Track payment balances with each shop owner</p>
      </div>

      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-chart-line text-primary"></i>
            Overall Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{formatCurrency(totals.currentBalance)}</div>
              <div className="text-sm text-muted-foreground">Current Balance</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalCredits)}</div>
              <div className="text-sm text-muted-foreground">Total Credits</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalDebits)}</div>
              <div className="text-sm text-muted-foreground">Total Debits</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shop Owner List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Shop Owner Balances</h3>
            <span className="text-sm text-muted-foreground">
              {showAllBalances ? `Showing all ${allShopOwnerBalances.length}` : `Top 5 of ${allShopOwnerBalances.length}`}
            </span>
          </div>
          
          {shopOwnerBalances.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No shop owner transactions yet. Balances will appear here when customers place orders.
              </CardContent>
            </Card>
          ) : (
            <>
              {shopOwnerBalances.map((balance: any, index: number) => (
                <Card 
                  key={balance.shopOwnerId} 
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedShopOwner === balance.shopOwnerId ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedShopOwner(balance.shopOwnerId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar>
                            <AvatarFallback>
                              {balance.shopOwnerName?.charAt(0) || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          {!showAllBalances && index < 3 && (
                            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-400 text-gray-900' :
                              'bg-orange-400 text-orange-900'
                            }`}>
                              {index + 1}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{balance.shopOwnerName}</h4>
                          <p className="text-sm text-muted-foreground">{balance.shopOwnerEmail}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          balance.currentBalance > 0 ? 'text-green-600' : 
                          balance.currentBalance < 0 ? 'text-red-600' : 
                          'text-muted-foreground'
                        }`}>
                          {formatCurrency(balance.currentBalance)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {balance.recentEntries?.length || 0} entries
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                      <div className="text-green-600">
                        Credits: {formatCurrency(balance.totalCredits)}
                      </div>
                      <div className="text-red-600">
                        Debits: {formatCurrency(balance.totalDebits)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Show More/Less Button for Balances */}
              {allShopOwnerBalances.length > 5 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowAllBalances(!showAllBalances)}
                >
                  <i className={`fas ${showAllBalances ? 'fa-chevron-up' : 'fa-chevron-down'} mr-2`}></i>
                  {showAllBalances ? 'Show Less' : `Show ${allShopOwnerBalances.length - 5} More`}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Detailed View */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Transaction Details</h3>
          
          {selectedShopOwnerData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedShopOwnerData.shopOwnerName}</span>
                  <Badge variant={selectedShopOwnerData.currentBalance >= 0 ? "default" : "destructive"}>
                    {formatCurrency(selectedShopOwnerData.currentBalance)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded">
                      <div className="text-green-600 font-semibold">{formatCurrency(selectedShopOwnerData.totalCredits)}</div>
                      <div className="text-muted-foreground">Total Credits</div>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded">
                      <div className="text-red-600 font-semibold">{formatCurrency(selectedShopOwnerData.totalDebits)}</div>
                      <div className="text-muted-foreground">Total Debits</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Recent Transactions</h4>
                      <span className="text-sm text-muted-foreground">
                        {showAllTransactions ? 'All transactions' : 'Recent 5 transactions'}
                      </span>
                    </div>
                    {selectedShopOwnerData.recentEntries?.length === 0 ? (
                      <div className="text-muted-foreground text-sm">No transactions yet</div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {(showAllTransactions 
                            ? selectedShopOwnerData.recentEntries 
                            : selectedShopOwnerData.recentEntries?.slice(0, 5)
                          )?.map((entry: any) => (
                            <div key={entry.id} className="flex items-center justify-between py-2 border-b">
                              <div>
                                <div className="text-sm font-medium">{entry.description}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(entry.createdAt)} • {entry.transactionType}
                                </div>
                              </div>
                              <div className={`font-semibold ${
                                entry.entryType === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {entry.entryType === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Show More/Less Button for Transactions */}
                        {selectedShopOwnerData.recentEntries?.length > 5 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={() => setShowAllTransactions(!showAllTransactions)}
                          >
                            <i className={`fas ${showAllTransactions ? 'fa-chevron-up' : 'fa-chevron-down'} mr-2`}></i>
                            {showAllTransactions ? 'Show Less' : `Show ${selectedShopOwnerData.recentEntries.length - 5} More`}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full">
                    <i className="fas fa-download mr-2"></i>
                    Export Statement
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Select a shop owner from the list to view detailed transaction history
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}