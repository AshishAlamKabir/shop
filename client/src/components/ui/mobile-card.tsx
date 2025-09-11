import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MobileCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerActions?: ReactNode;
  footer?: ReactNode;
}

export function MobileCard({ 
  title, 
  children, 
  className = "", 
  headerActions,
  footer 
}: MobileCardProps) {
  return (
    <Card className={`mobile-card shadow-md border-0 rounded-2xl bg-card ${className}`}>
      {title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              {title}
            </CardTitle>
            {headerActions}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-4">
        {children}
      </CardContent>
      {footer && (
        <div className="px-4 pb-4">
          {footer}
        </div>
      )}
    </Card>
  );
}

// Product Card specifically optimized for mobile
interface MobileProductCardProps {
  id: string;
  name: string;
  price: number;
  image?: string;
  description?: string;
  onAddToCart?: () => void;
  onQuickBuy?: () => void;
  inStock?: boolean;
  discount?: number;
}

export function MobileProductCard({
  id,
  name,
  price,
  image,
  description,
  onAddToCart,
  onQuickBuy,
  inStock = true,
  discount
}: MobileProductCardProps) {
  return (
    <MobileCard className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Product Image */}
      {image && (
        <div className="relative w-full h-40 bg-muted rounded-t-2xl overflow-hidden">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {discount && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              -{discount}%
            </div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
      )}
      
      {/* Product Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground text-base line-clamp-2 leading-tight">
            {name}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        
        {/* Price */}
        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold text-primary">
            ₹{price.toFixed(2)}
          </span>
          {discount && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{(price * (1 + discount / 100)).toFixed(2)}
            </span>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          {onAddToCart && (
            <button 
              onClick={onAddToCart}
              disabled={!inStock}
              className="flex-1 bg-muted text-foreground py-3 px-4 rounded-xl font-medium text-sm hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center justify-center"
            >
              Add to Cart
            </button>
          )}
          {onQuickBuy && (
            <button 
              onClick={onQuickBuy}
              disabled={!inStock}
              className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center justify-center"
            >
              Buy Now
            </button>
          )}
        </div>
      </div>
    </MobileCard>
  );
}

// Order Card optimized for mobile
interface MobileOrderCardProps {
  orderId: string;
  customerName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  status: string;
  date: string;
  onViewDetails?: () => void;
  onUpdateStatus?: () => void;
}

export function MobileOrderCard({
  orderId,
  customerName,
  items,
  totalAmount,
  status,
  date,
  onViewDetails,
  onUpdateStatus
}: MobileOrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <MobileCard className="border-l-4 border-l-primary">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Order #{orderId.slice(-8)}</h3>
            <p className="text-sm text-muted-foreground">{date}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status}
          </div>
        </div>
        
        {/* Customer */}
        <div>
          <p className="text-sm font-medium text-foreground">{customerName}</p>
        </div>
        
        {/* Items Summary */}
        <div className="bg-muted rounded-lg p-3">
          <p className="text-sm font-medium text-foreground mb-2">
            {items.length} item{items.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-1">
            {items.slice(0, 2).map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
                <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {items.length > 2 && (
              <p className="text-xs text-muted-foreground">+{items.length - 2} more items</p>
            )}
          </div>
        </div>
        
        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-foreground">Total:</span>
          <span className="text-lg font-bold text-primary">₹{totalAmount.toFixed(2)}</span>
        </div>
        
        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          {onViewDetails && (
            <button 
              onClick={onViewDetails}
              className="flex-1 bg-muted text-foreground py-3 px-4 rounded-xl font-medium text-sm hover:bg-muted/80 transition-colors min-h-[44px] flex items-center justify-center"
            >
              View Details
            </button>
          )}
          {onUpdateStatus && (
            <button 
              onClick={onUpdateStatus}
              className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors min-h-[44px] flex items-center justify-center"
            >
              Update Status
            </button>
          )}
        </div>
      </div>
    </MobileCard>
  );
}