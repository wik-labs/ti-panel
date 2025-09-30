// prościutki cart w localStorage (sesyjny)
export type CartItemBasic = { tiPartNumber: string; quantity: number };

const CART_KEY = 'ti-cart';

export function getCart(): CartItemBasic[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) return arr.filter(x => x?.tiPartNumber && x?.quantity > 0);
    return [];
  } catch { return []; }
}

export function setCart(items: CartItemBasic[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(item: CartItemBasic) {
  const cur = getCart();
  const idx = cur.findIndex(x => x.tiPartNumber === item.tiPartNumber);
  if (idx >= 0) cur[idx] = { ...cur[idx], quantity: cur[idx].quantity + item.quantity };
  else cur.push(item);
  setCart(cur);
}

export function removeFromCart(pn: string) {
  setCart(getCart().filter(x => x.tiPartNumber !== pn));
}

export function clearCart() {
  setCart([]);
}
