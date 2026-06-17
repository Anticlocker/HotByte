"use client";
import { useState, useCallback, useRef, useEffect } from "react";

interface MenuItemVariant {
  id: number;
  variant_name: string;
  price: number;
}

interface MenuItem {
  item_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_name: string;
  is_available: boolean;
  is_veg: boolean;
  avg_rating?: string;
  reviews_count?: string;
  variants?: MenuItemVariant[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedVariant?: MenuItemVariant;
}

export function useCart(hotelSlug: string, isOpen: boolean) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const saveCartToStorage = useCallback((updatedCart: CartItem[]) => {
    setCart(updatedCart);
    cartRef.current = updatedCart;
    try {
      localStorage.setItem(`hotbyte_cart_${hotelSlug}`, JSON.stringify(updatedCart));
    } catch {}
    window.dispatchEvent(new Event("cartUpdated"));
  }, [hotelSlug]);

  const restoreCart = useCallback(() => {
    try {
      const savedCart = localStorage.getItem(`hotbyte_cart_${hotelSlug}`);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setCart(parsed);
        cartRef.current = parsed;
      }
    } catch {}
  }, [hotelSlug]);

  const handleAddToCart = useCallback((item: MenuItem, selectedVariant?: MenuItemVariant) => {
    if (!isOpen) return;
    if (!item.is_available) return;
    const currentCart = cartRef.current;
    const priceToUse = selectedVariant ? selectedVariant.price : item.price;

    const existingIndex = currentCart.findIndex((i) => {
      const sameItem = i.item_id === item.item_id;
      const sameVariant = selectedVariant
        ? i.selectedVariant?.id === selectedVariant.id
        : !i.selectedVariant;
      return sameItem && sameVariant;
    });

    if (existingIndex > -1) {
      const updated = currentCart.map((i, idx) =>
        idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
      );
      saveCartToStorage(updated);
    } else {
      saveCartToStorage([...currentCart, { ...item, price: priceToUse, quantity: 1, selectedVariant }]);
    }

    navigator.vibrate?.(50);
  }, [isOpen, saveCartToStorage]);

  const handleDecreaseQuantity = useCallback((itemId: number, selectedVariant?: MenuItemVariant) => {
    if (!isOpen) return;
    const currentCart = cartRef.current;

    const existingIndex = currentCart.findIndex((i) => {
      const sameItem = i.item_id === itemId;
      const sameVariant = selectedVariant
        ? i.selectedVariant?.id === selectedVariant.id
        : !i.selectedVariant;
      return sameItem && sameVariant;
    });

    if (existingIndex === -1) return;
    const existing = currentCart[existingIndex];
    if (existing.quantity === 1) {
      saveCartToStorage(currentCart.filter((_, idx) => idx !== existingIndex));
    } else {
      saveCartToStorage(
        currentCart.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity - 1 } : i
        )
      );
    }
  }, [isOpen, saveCartToStorage]);

  const handleRemoveFromCart = useCallback((itemId: number, selectedVariant?: MenuItemVariant) => {
    const currentCart = cartRef.current;
    saveCartToStorage(
      currentCart.filter((i) => {
        const sameItem = i.item_id === itemId;
        const sameVariant = selectedVariant
          ? i.selectedVariant?.id === selectedVariant.id
          : !i.selectedVariant;
        return !(sameItem && sameVariant);
      })
    );
  }, [saveCartToStorage]);

  const handleClearCart = useCallback(() => {
    saveCartToStorage([]);
  }, [saveCartToStorage]);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return {
    cart,
    setCart,
    cartTotal,
    cartCount,
    restoreCart,
    handleAddToCart,
    handleDecreaseQuantity,
    handleRemoveFromCart,
    handleClearCart,
  };
}
