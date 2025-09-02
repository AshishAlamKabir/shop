import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  listingId: string;
  storeId: string;
  name: string;
  brand: string;
  size: string;
  price: number;
  imageUrl: string;
  qty: number;
}

interface CartState {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeFromCart: (listingId: string) => void;
  updateQuantity: (listingId: string, qty: number) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      
      addToCart: (item) => {
        const { cart } = get();
        const existingItem = cart.find(cartItem => cartItem.listingId === item.listingId);
        
        if (existingItem) {
          // Update quantity of existing item
          set({
            cart: cart.map(cartItem =>
              cartItem.listingId === item.listingId
                ? { ...cartItem, qty: cartItem.qty + (item.qty || 1) }
                : cartItem
            )
          });
        } else {
          // Add new item to cart
          set({
            cart: [...cart, { ...item, qty: item.qty || 1 }]
          });
        }
      },
      
      removeFromCart: (listingId) => {
        set({
          cart: get().cart.filter(item => item.listingId !== listingId)
        });
      },
      
      updateQuantity: (listingId, qty) => {
        if (qty <= 0) {
          get().removeFromCart(listingId);
          return;
        }
        
        set({
          cart: get().cart.map(item =>
            item.listingId === listingId ? { ...item, qty } : item
          )
        });
      },
      
      clearCart: () => {
        set({ cart: [] });
      },
      
      getTotalAmount: () => {
        return get().cart.reduce((total, item) => total + (item.price * item.qty), 0);
      },
      
      getItemCount: () => {
        return get().cart.reduce((count, item) => count + item.qty, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
