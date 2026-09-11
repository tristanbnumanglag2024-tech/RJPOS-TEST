export type AppScreen = "store-select" | "login" | "pos" | "lock";

export type POSView = "cart" | "payment" | "receipt";

export type PayMethod = "cash" | "card" | "gcash" | "qr";

export type DiscountType = "percentage" | "fixed";

export interface Store {
  id: string;
  name: string;
  branch: string;
  address: string;
  terminal: string;
}

export interface User {
  id: string;
  username?: string;
  name: string;
  full_name?: string;
  email: string;
  phone?: string;
  role: "cashier" | "manager" | "admin";
  store_id: string;
  pin_hash: string;
  active: boolean;
  pos_access: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  stock: number;
  barcode?: string | null;
}

export interface CartItem extends Product {
  qty: number;
}

export interface Discount {
  id?: string;
  code?: string;
  name?: string;
  scope?: string;
  min_order?: number;
  type: DiscountType;
  value: number;
  reason: string;
}

export interface HeldOrder {
  id: string;
  label: string;
  holdNo?: string;
  cart: CartItem[];
  customer: Customer | null;
  discount: Discount | null;
  subtotal: number;
  heldAt: Date;
  notes?: string | null;
}

export interface POSSession {
  user: User;
  store: Store;
  cart: CartItem[];
  customer: Customer | null;
  discount: Discount | null;
  view: POSView;
  heldOrders: HeldOrder[];
  txnId: string;
}
