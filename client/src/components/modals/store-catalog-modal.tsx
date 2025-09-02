import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/cart";
import { useToast } from "@/hooks/use-toast";

interface StoreCatalogModalProps {
  store: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function StoreCatalogModal({ store, isOpen, onClose }: StoreCatalogModalProps) {
  const { addToCart } = useCartStore();
  const { toast } = useToast();

  const { data: storeWithListings, isLoading } = useQuery({
    queryKey: ['/api/stores', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;
      const response = await fetch(`/api/stores/${store.id}`);
      if (!response.ok) throw new Error('Failed to fetch store details');
      return response.json();
    },
    enabled: !!store?.id && isOpen
  });

  const handleAddToCart = (listing: any) => {
    addToCart({
      listingId: listing.id,
      storeId: store.id,
      name: listing.product.name,
      brand: listing.product.brand,
      size: listing.product.size,
      price: parseFloat(listing.priceRetail),
      imageUrl: listing.product.imageUrl,
      qty: 1
    });
    
    toast({ 
      title: "Added to cart!", 
      description: `${listing.product.name} has been added to your cart.` 
    });
  };

  if (!isOpen || !store) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground">{store.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">Browse products and add to cart</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-auto max-h-[70vh] p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading products...</span>
            </div>
          ) : !storeWithListings?.listings || storeWithListings.listings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-box-open text-4xl mb-4 opacity-50"></i>
              <p>No products available in this store</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {storeWithListings.listings.map((listing: any) => (
                <div 
                  key={listing.id} 
                  className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                  data-testid={`product-card-${listing.id}`}
                >
                  <img 
                    src={listing.product.imageUrl || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=160'} 
                    alt={listing.product.name}
                    className="w-full h-40 object-cover rounded-md mb-3"
                  />
                  <h4 className="font-medium text-foreground mb-1">{listing.product.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {listing.product.brand} • {listing.product.size}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-foreground">₹{listing.priceRetail}</div>
                      <div className="text-xs text-muted-foreground">
                        {listing.stockQty > 0 ? `${listing.stockQty} in stock` : 'Stock not specified'}
                      </div>
                    </div>
                    <Badge 
                      variant={listing.available ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {listing.available ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <Button 
                    onClick={() => handleAddToCart(listing)}
                    disabled={!listing.available}
                    className="w-full"
                    data-testid={`button-add-to-cart-${listing.id}`}
                  >
                    {listing.available ? (
                      <>
                        <i className="fas fa-cart-plus mr-2"></i>
                        Add to Cart
                      </>
                    ) : (
                      <>
                        <i className="fas fa-ban mr-2"></i>
                        Out of Stock
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
