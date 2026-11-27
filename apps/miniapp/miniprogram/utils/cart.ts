/**
 * 本地购物车（仅存于当前设备，下单时以 retailPrice 为准）。
 */
export interface CartItem {
  skuId: string;
  productId: string;
  name: string;
  spec: string;
  unit: string;
  /** 顾客零售价，单位：分 */
  retailPrice: number;
  qty: number;
  image: string;
}

const CART_KEY = 'cart';

export function getCart(): CartItem[] {
  return (wx.getStorageSync(CART_KEY) as CartItem[]) || [];
}

function saveCart(items: CartItem[]): void {
  wx.setStorageSync(CART_KEY, items);
}

/** 同 skuId 合并数量 */
export function addToCart(item: CartItem): void {
  const items = getCart();
  const index = items.findIndex((i) => i.skuId === item.skuId);
  if (index >= 0) {
    items[index] = { ...items[index], qty: items[index].qty + item.qty };
  } else {
    items.push(item);
  }
  saveCart(items);
}

export function setCartQty(skuId: string, qty: number): void {
  const items = getCart();
  const index = items.findIndex((i) => i.skuId === skuId);
  if (index < 0) return;
  if (qty <= 0) {
    items.splice(index, 1);
  } else {
    items[index] = { ...items[index], qty };
  }
  saveCart(items);
}

export function removeFromCart(skuId: string): void {
  saveCart(getCart().filter((i) => i.skuId !== skuId));
}

export function clearCart(): void {
  wx.removeStorageSync(CART_KEY);
}

export function cartCount(): number {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}
