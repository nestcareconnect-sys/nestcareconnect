import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Cart, CartItem, Product, Hamper, CustomHamperData, Coupon, CountryCode, CurrencyCode } from '../types';
import { cartApi, couponsApi } from '../services/api';
import { useCountryCurrency } from './CountryCurrencyContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface CartContextType {
  cart: Cart | null;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  appliedCoupon: Coupon | null;
  isCartDrawerOpen: boolean;
  isLoading: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  addProductToCart: (product: Product, quantity?: number) => Promise<void>;
  addHamperToCart: (hamper: Hamper, quantity?: number, personalization?: any) => Promise<void>;
  addCustomHamperToCart: (customData: CustomHamperData, quantity?: number) => Promise<void>;
  updateItemQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { country, currency, calculateProductPrice, calculateHamperPrice } = useCountryCurrency();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [cart, setCart] = useState<Cart | null>(null);
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Local Guest ID
  const [guestId] = useState<string>(() => {
    let gid = localStorage.getItem('ncc_guest_id');
    if (!gid) {
      gid = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('ncc_guest_id', gid);
    }
    return gid;
  });

  // Track pending background requests to avoid race conditions
  const pendingRequestsCountRef = useRef(0);
  const pendingAddPromiseRef = useRef<Promise<any> | null>(null);

  // Helper to calculate totals from an items list
  const calculateTotals = useCallback(
    (currentItems: CartItem[]) => {
      const subtotal = currentItems.reduce((acc, itm) => acc + (itm.totalPrice || itm.unitPrice * itm.quantity), 0);
      let discount = 0;
      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'PERCENTAGE') {
          discount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
          if (appliedCoupon.maxDiscountINR && discount > appliedCoupon.maxDiscountINR) {
            discount = appliedCoupon.maxDiscountINR;
          }
        } else {
          discount = appliedCoupon.discountValue;
        }
      }
      const shippingFee = subtotal > 0 && subtotal < 1500 ? (currency === 'INR' ? 99 : currency === 'AED' ? 15 : 5) : 0;
      const tax = Math.round(subtotal * 0.05); // 5% standard healthcare GST/VAT
      const total = Math.max(0, subtotal - discount + shippingFee + tax);
      const itemCount = currentItems.reduce((acc, itm) => acc + (itm.quantity || 1), 0);

      return { subtotal, discount, shippingFee, tax, total, itemCount };
    },
    [appliedCoupon, currency]
  );

  const refreshCart = useCallback(async () => {
    try {
      const res = await cartApi.getCart({
        guestId: isAuthenticated ? undefined : guestId,
        country,
        currency,
        couponCode: couponCode || undefined,
      });

      if (res.data?.success && res.data.data) {
        setCart(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load cart from server:', err);
    }
  }, [guestId, isAuthenticated, country, currency, couponCode]);

  // Merge guest cart upon login
  useEffect(() => {
    if (isAuthenticated && guestId) {
      cartApi
        .mergeGuestCart({ guestId })
        .then(() => refreshCart())
        .catch(() => {});
    }
  }, [isAuthenticated, guestId, refreshCart]);

  // Recalculate cart whenever country, currency, or user changes
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  /**
   * OPTIMISTIC ADD PRODUCT TO CART
   */
  const addProductToCart = async (product: Product, quantity = 1) => {
    const { price } = calculateProductPrice(product);
    const unitPrice = price;
    const totalPrice = unitPrice * quantity;
    const tempClientId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Snapshot previous state for rollback
    const previousCart = cart;

    // Optimistically update local cart immediately
    setCart((prev) => {
      const existingItems = prev?.items ? [...prev.items] : [];
      const existingIdx = existingItems.findIndex(
        (itm) => itm.itemType === 'PRODUCT' && itm.productId === product.id
      );

      if (existingIdx >= 0) {
        const existing = existingItems[existingIdx];
        const newQty = existing.quantity + quantity;
        existingItems[existingIdx] = {
          ...existing,
          quantity: newQty,
          totalPrice: existing.unitPrice * newQty,
        };
      } else {
        const optimisticItem: CartItem = {
          id: tempClientId,
          clientId: tempClientId,
          isOptimistic: true,
          itemType: 'PRODUCT',
          productId: product.id,
          name: product.name,
          quantity,
          unitPrice,
          totalPrice,
          snapshot: {
            name: product.name,
            sku: product.sku,
            image: product.images?.[0] || '',
            unitPrice,
            unit: product.unit,
          },
          product,
        };
        existingItems.push(optimisticItem);
      }

      const totals = calculateTotals(existingItems);
      return {
        id: prev?.id || 'cart-current',
        items: existingItems,
        ...totals,
        currency: currency as CurrencyCode,
        country: country as CountryCode,
      };
    });

    // Instant UI feedback
    showToast(`✓ "${product.name}" added to cart!`, 'success');
    setIsCartDrawerOpen(true);

    // Sync in background
    pendingRequestsCountRef.current += 1;
    const addPromise = cartApi.addItem({
      guestId: isAuthenticated ? undefined : guestId,
      itemType: 'PRODUCT',
      productId: product.id,
      quantity,
      country,
      currency,
      couponCode: couponCode || undefined,
    });
    pendingAddPromiseRef.current = addPromise;

    try {
      const res = await addPromise;
      if (res.data?.success && res.data.data) {
        // Authoritative server cart replaces optimistic item with real database CartItem ID
        setCart(res.data.data);
      }
    } catch (err: any) {
      // Rollback on server rejection (e.g. out of stock)
      setCart(previousCart);
      showToast(err.response?.data?.message || `Could not add "${product.name}" to cart.`, 'error');
    } finally {
      pendingRequestsCountRef.current -= 1;
      if (pendingAddPromiseRef.current === addPromise) {
        pendingAddPromiseRef.current = null;
      }
    }
  };

  /**
   * OPTIMISTIC ADD HAMPER TO CART
   */
  const addHamperToCart = async (hamper: Hamper, quantity = 1, personalization?: any) => {
    const unitPrice = calculateHamperPrice(hamper);
    const totalPrice = unitPrice * quantity;
    const tempClientId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const previousCart = cart;

    setCart((prev) => {
      const existingItems = prev?.items ? [...prev.items] : [];
      const targetPersonalizationStr = JSON.stringify(personalization || {});
      const existingIdx = existingItems.findIndex(
        (itm) =>
          itm.itemType === 'HAMPER' &&
          itm.hamperId === hamper.id &&
          JSON.stringify(itm.snapshot?.personalization || itm.personalization || {}) === targetPersonalizationStr
      );

      if (existingIdx >= 0) {
        const existing = existingItems[existingIdx];
        const newQty = existing.quantity + quantity;
        existingItems[existingIdx] = {
          ...existing,
          quantity: newQty,
          totalPrice: existing.unitPrice * newQty,
        };
      } else {
        const optimisticItem: CartItem = {
          id: tempClientId,
          clientId: tempClientId,
          isOptimistic: true,
          itemType: 'HAMPER',
          hamperId: hamper.id,
          name: hamper.name,
          quantity,
          unitPrice,
          totalPrice,
          personalization,
          snapshot: {
            name: hamper.name,
            image: hamper.images?.[0] || '',
            unitPrice,
            personalization,
          },
          hamper,
        };
        existingItems.push(optimisticItem);
      }

      const totals = calculateTotals(existingItems);
      return {
        id: prev?.id || 'cart-current',
        items: existingItems,
        ...totals,
        currency: currency as CurrencyCode,
        country: country as CountryCode,
      };
    });

    showToast(`✓ "${hamper.name}" added to cart!`, 'success');
    setIsCartDrawerOpen(true);

    const addPromise = cartApi.addItem({
      guestId: isAuthenticated ? undefined : guestId,
      itemType: 'HAMPER',
      hamperId: hamper.id,
      quantity,
      personalization,
      country,
      currency,
      couponCode: couponCode || undefined,
    });
    pendingAddPromiseRef.current = addPromise;

    try {
      const res = await addPromise;
      if (res.data?.success && res.data.data) {
        setCart(res.data.data);
      }
    } catch (err: any) {
      setCart(previousCart);
      showToast(err.response?.data?.message || 'Could not add hamper to cart.', 'error');
    } finally {
      if (pendingAddPromiseRef.current === addPromise) {
        pendingAddPromiseRef.current = null;
      }
    }
  };

  /**
   * OPTIMISTIC ADD CUSTOM HAMPER
   */
  const addCustomHamperToCart = async (customData: CustomHamperData, quantity = 1) => {
    const previousCart = cart;
    const unitPrice = customData.totalPrice || 500;
    const totalPrice = unitPrice * quantity;
    const tempClientId = `opt-custom-${Date.now()}`;

    setCart((prev) => {
      const existingItems = prev?.items ? [...prev.items] : [];
      const optimisticItem: CartItem = {
        id: tempClientId,
        clientId: tempClientId,
        isOptimistic: true,
        itemType: 'CUSTOM_HAMPER',
        customHamperData: customData,
        name: customData.box?.name ? `Custom Hamper (${customData.box.name})` : 'Custom Care Hamper',
        quantity,
        unitPrice,
        totalPrice,
        snapshot: {
          name: 'Custom Care Hamper',
          box: customData.box,
          unitPrice,
          items: customData.items,
        },
      };
      existingItems.push(optimisticItem);

      const totals = calculateTotals(existingItems);
      return {
        id: prev?.id || 'cart-current',
        items: existingItems,
        ...totals,
        currency: currency as CurrencyCode,
        country: country as CountryCode,
      };
    });

    showToast('✓ Custom hamper added to cart!', 'success');
    setIsCartDrawerOpen(true);

    const addPromise = cartApi.addItem({
      guestId: isAuthenticated ? undefined : guestId,
      itemType: 'CUSTOM_HAMPER',
      customHamperData: customData,
      quantity,
      country,
      currency,
      couponCode: couponCode || undefined,
    });
    pendingAddPromiseRef.current = addPromise;

    try {
      const res = await addPromise;
      if (res.data?.success && res.data.data) {
        setCart(res.data.data);
      }
    } catch (err: any) {
      setCart(previousCart);
      showToast(err.response?.data?.message || 'Could not add custom hamper to cart.', 'error');
    } finally {
      if (pendingAddPromiseRef.current === addPromise) {
        pendingAddPromiseRef.current = null;
      }
    }
  };

  /**
   * OPTIMISTIC QUANTITY UPDATE
   * NEVER send an opt-* ID to backend /api/cart/items/:id
   */
  const updateItemQuantity = async (cartItemId: string, quantity: number) => {
    const previousCart = cart;

    // 1. Instant local UI update
    setCart((prev) => {
      if (!prev) return prev;
      let updatedItems: CartItem[];

      if (quantity <= 0) {
        updatedItems = prev.items.filter((itm) => itm.id !== cartItemId && itm.clientId !== cartItemId);
      } else {
        updatedItems = prev.items.map((itm) => {
          if (itm.id === cartItemId || itm.clientId === cartItemId) {
            return {
              ...itm,
              quantity,
              totalPrice: itm.unitPrice * quantity,
            };
          }
          return itm;
        });
      }

      const totals = calculateTotals(updatedItems);
      return {
        ...prev,
        items: updatedItems,
        ...totals,
      };
    });

    try {
      let realItemId = cartItemId;

      // Check if this is an optimistic item
      if (cartItemId.startsWith('opt-') || previousCart?.items.find((i) => i.id === cartItemId)?.isOptimistic) {
        if (pendingAddPromiseRef.current) {
          // Await in-flight addition to obtain the real database ID
          const addRes = await pendingAddPromiseRef.current;
          if (addRes?.data?.data?.items) {
            const targetItem = previousCart?.items.find((i) => i.id === cartItemId);
            const serverItem = addRes.data.data.items.find(
              (i: any) =>
                (targetItem?.productId && i.productId === targetItem.productId) ||
                (targetItem?.hamperId && i.hamperId === targetItem.hamperId)
            );
            if (serverItem && serverItem.id && !serverItem.id.startsWith('opt-')) {
              realItemId = serverItem.id;
            }
          }
        } else {
          // No in-flight promise: refresh cart from server
          await refreshCart();
          return;
        }
      }

      // Only perform network request if we have a persisted DB ID
      if (realItemId && !realItemId.startsWith('opt-')) {
        const res = await cartApi.updateQty(realItemId, quantity, {
          country,
          currency,
          couponCode: couponCode || undefined,
        });

        if (res.data?.success && res.data.data) {
          setCart(res.data.data);
        }
      } else {
        await refreshCart();
      }
    } catch (err: any) {
      setCart(previousCart);
      showToast(err.response?.data?.message || 'Could not update quantity.', 'error');
    }
  };

  /**
   * OPTIMISTIC REMOVE ITEM
   * NEVER send an opt-* ID to backend /api/cart/items/:id
   */
  const removeItem = async (cartItemId: string) => {
    const previousCart = cart;

    // 1. Instant local UI update
    setCart((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.filter((itm) => itm.id !== cartItemId && itm.clientId !== cartItemId);
      const totals = calculateTotals(updatedItems);
      return {
        ...prev,
        items: updatedItems,
        ...totals,
      };
    });

    showToast('Item removed from cart.', 'info');

    try {
      let realItemId = cartItemId;

      if (cartItemId.startsWith('opt-') || previousCart?.items.find((i) => i.id === cartItemId)?.isOptimistic) {
        if (pendingAddPromiseRef.current) {
          const addRes = await pendingAddPromiseRef.current;
          if (addRes?.data?.data?.items) {
            const targetItem = previousCart?.items.find((i) => i.id === cartItemId);
            const serverItem = addRes.data.data.items.find(
              (i: any) =>
                (targetItem?.productId && i.productId === targetItem.productId) ||
                (targetItem?.hamperId && i.hamperId === targetItem.hamperId)
            );
            if (serverItem && serverItem.id && !serverItem.id.startsWith('opt-')) {
              realItemId = serverItem.id;
            }
          }
        } else {
          await refreshCart();
          return;
        }
      }

      if (realItemId && !realItemId.startsWith('opt-')) {
        const res = await cartApi.removeItem(realItemId, {
          country,
          currency,
          couponCode: couponCode || undefined,
        });

        if (res.data?.success && res.data.data) {
          setCart(res.data.data);
        }
      } else {
        await refreshCart();
      }
    } catch (err: any) {
      setCart(previousCart);
      showToast(err.response?.data?.message || 'Could not remove item.', 'error');
    }
  };

  /**
   * OPTIMISTIC CLEAR CART
   */
  const clearCart = async () => {
    const previousCart = cart;

    setCart(null);
    setCouponCode('');
    setAppliedCoupon(null);

    try {
      await cartApi.clearCart({
        guestId: isAuthenticated ? undefined : guestId,
        country,
        currency,
      });
    } catch (err: any) {
      setCart(previousCart);
      showToast('Could not clear cart.', 'error');
    }
  };

  /**
   * APPLY COUPON
   */
  const applyCoupon = async (code: string): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    try {
      const res = await couponsApi.validate({
        code: code.trim(),
        country,
        subtotal: cart?.subtotal || 0,
      });

      if (res.data?.success && res.data.data) {
        const coupon = res.data.data;
        setCouponCode(code.trim());
        setAppliedCoupon(coupon);

        // Recompute cart with coupon
        if (cart) {
          let discount = 0;
          if (coupon.discountType === 'PERCENTAGE') {
            discount = Math.round((cart.subtotal * coupon.discountValue) / 100);
            if (coupon.maxDiscountINR && discount > coupon.maxDiscountINR) {
              discount = coupon.maxDiscountINR;
            }
          } else {
            discount = coupon.discountValue;
          }
          const total = Math.max(0, cart.subtotal - discount + cart.shippingFee + cart.tax);
          setCart((prev) => (prev ? { ...prev, discount, total } : null));
        }

        refreshCart();
        return { success: true, message: `Coupon "${code.toUpperCase()}" applied successfully!` };
      }
      return { success: false, message: 'Invalid or expired coupon code.' };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || 'Could not apply coupon.' };
    } finally {
      setIsLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    if (cart) {
      const total = Math.max(0, cart.subtotal + cart.shippingFee + cart.tax);
      setCart((prev) => (prev ? { ...prev, discount: 0, total } : null));
    }
    refreshCart();
    showToast('Coupon removed.', 'info');
  };

  const items = cart?.items || [];
  const itemCount = (cart as any)?.itemCount ?? items.reduce((acc, itm) => acc + (itm.quantity || 1), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        items,
        itemCount,
        subtotal: cart?.subtotal || 0,
        discount: cart?.discount || 0,
        shippingFee: cart?.shippingFee || 0,
        tax: cart?.tax || 0,
        total: cart?.total || 0,
        appliedCoupon,
        isCartDrawerOpen,
        isLoading,
        openCartDrawer: () => setIsCartDrawerOpen(true),
        closeCartDrawer: () => setIsCartDrawerOpen(false),
        addProductToCart,
        addHamperToCart,
        addCustomHamperToCart,
        updateItemQuantity,
        removeItem,
        clearCart,
        applyCoupon,
        removeCoupon,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
