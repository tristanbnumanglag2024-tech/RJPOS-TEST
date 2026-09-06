import type { Store, User, Customer, Product } from "@/types/pos";

export const STORES: Store[] = [
  { id: "s1", name: "Rhea Mart", branch: "Makati Branch",  address: "Gil Puyat Ave, Makati City",       terminal: "T-001" },
  { id: "s2", name: "Rhea Mart", branch: "BGC Branch",     address: "30th St, Bonifacio Global City",    terminal: "T-003" },
  { id: "s3", name: "Rhea Mart", branch: "Ortigas Branch", address: "Emerald Ave, Ortigas Center",       terminal: "T-005" },
];

// password for all active users: pos1234
export const MOCK_PASSWORD = "pos1234";

export const USERS: User[] = [
  { id: "u1", name: "Maria Santos", email: "maria.santos@rheapos.com", role: "cashier", store_id: "s1", pin_hash: "1234", active: true,  pos_access: true  },
  { id: "u2", name: "James Reyes",  email: "james.reyes@rheapos.com",  role: "manager", store_id: "s2", pin_hash: "5678", active: true,  pos_access: true  },
  { id: "u3", name: "Ana Cruz",     email: "ana.cruz@rheapos.com",     role: "cashier", store_id: "s3", pin_hash: "9012", active: false, pos_access: true  },
  { id: "u4", name: "Pedro Lim",    email: "pedro.lim@rheapos.com",    role: "admin",   store_id: "s1", pin_hash: "3456", active: true,  pos_access: false },
];

export const CUSTOMERS: Customer[] = [
  { id: "c1", name: "James Whitfield", phone: "+63 917-555-0142", email: "james.whitfield@email.com", points: 1240 },
  { id: "c2", name: "Aisha Patel",     phone: "+63 917-555-0187", email: "aisha.patel@email.com",     points: 680  },
  { id: "c3", name: "Robert Chen",     phone: "+63 917-555-0231", email: "robert.chen@email.com",     points: 3200 },
  { id: "c4", name: "Emma Liu",        phone: "+63 917-555-0194", email: "emma.liu@email.com",        points: 920  },
  { id: "c5", name: "Carlos Reyes",    phone: "+63 917-555-0308", email: "carlos.reyes@email.com",    points: 450  },
  { id: "c6", name: "Sofia Mendoza",   phone: "+63 917-555-0412", email: "sofia.mendoza@email.com",   points: 2800 },
];

export const PRODUCTS: Product[] = [
  { id: "p1",  name: "Samsung 65\" 4K Smart TV",    sku: "ELEC-TV-001",  price: 64999, category: "Electronics",          stock: 8   },
  { id: "p2",  name: "AirPods Pro (2nd Gen)",        sku: "ELEC-APL-002", price: 14999, category: "Electronics",          stock: 24  },
  { id: "p3",  name: "Men's Slim Fit Chinos",        sku: "CLTH-MN-001",  price: 2999,  category: "Clothing",             stock: 3   },
  { id: "p4",  name: "Women's Running Jacket",       sku: "CLTH-WN-003",  price: 4299,  category: "Clothing",             stock: 0   },
  { id: "p5",  name: "Neutrogena Hydro Boost Serum", sku: "BEAU-SK-002",  price: 1649,  category: "Beauty & Personal Care",stock: 56  },
  { id: "p6",  name: "Dyson V15 Detect Vacuum",      sku: "HOME-VC-001",  price: 37999, category: "Home & Kitchen",       stock: 5   },
  { id: "p7",  name: "Nike Air Max 270",             sku: "SPRT-NK-001",  price: 6999,  category: "Sports & Outdoors",    stock: 18  },
  { id: "p8",  name: "Lay's Classic Chips 200g",     sku: "FOOD-LP-001",  price: 175,   category: "Food & Snacks",        stock: 220 },
  { id: "p9",  name: "Canon EOS Rebel SL3",          sku: "ELEC-CAM-003", price: 42999, category: "Electronics",          stock: 2   },
  { id: "p10", name: "Lego Technic 4×4 Jeep",        sku: "TOYS-LG-001",  price: 11499, category: "Toys & Games",         stock: 11  },
  { id: "p11", name: "Instant Pot Duo 7-in-1",       sku: "HOME-IP-002",  price: 8999,  category: "Home & Kitchen",       stock: 14  },
  { id: "p12", name: "Yoga Mat Premium 6mm",         sku: "SPRT-YG-001",  price: 1299,  category: "Sports & Outdoors",    stock: 33  },
  { id: "p13", name: "Lipstick Matte Collection",    sku: "BEAU-LP-001",  price: 499,   category: "Beauty & Personal Care",stock: 72  },
  { id: "p14", name: "Staples Refill Box 500s",      sku: "OFFC-ST-001",  price: 89,    category: "Office Supplies",      stock: 140 },
  { id: "p15", name: "Polo Shirt Classic Fit",       sku: "CLTH-PS-002",  price: 1799,  category: "Clothing",             stock: 29  },
  { id: "p16", name: "Pringles Original 110g",       sku: "FOOD-PR-002",  price: 120,   category: "Food & Snacks",        stock: 88  },
];

export const CATEGORIES = [
  "All",
  "Electronics",
  "Clothing",
  "Beauty & Personal Care",
  "Home & Kitchen",
  "Sports & Outdoors",
  "Food & Snacks",
  "Toys & Games",
  "Office Supplies",
];

export const CATEGORY_PALETTE: Record<string, { bg: string; text: string; activeBorder: string }> = {
  "Electronics":          { bg: "bg-blue-100",    text: "text-blue-600",    activeBorder: "border-blue-400"   },
  "Clothing":             { bg: "bg-violet-100",  text: "text-violet-600",  activeBorder: "border-violet-400" },
  "Beauty & Personal Care":{ bg: "bg-pink-100",   text: "text-pink-600",    activeBorder: "border-pink-400"   },
  "Home & Kitchen":       { bg: "bg-emerald-100", text: "text-emerald-700", activeBorder: "border-emerald-400"},
  "Sports & Outdoors":    { bg: "bg-teal-100",    text: "text-teal-600",    activeBorder: "border-teal-400"   },
  "Food & Snacks":        { bg: "bg-yellow-100",  text: "text-amber-600",   activeBorder: "border-amber-400"  },
  "Toys & Games":         { bg: "bg-orange-100",  text: "text-orange-600",  activeBorder: "border-orange-400" },
  "Office Supplies":      { bg: "bg-slate-200",   text: "text-slate-600",   activeBorder: "border-slate-400"  },
};

export const DISCOUNT_REASONS = [
  "Manager Approval",
  "Loyalty Reward",
  "Damaged Packaging",
  "Clearance Sale",
  "Employee Discount",
  "Senior Citizen (20%)",
  "PWD Discount (20%)",
];

export function generateTxnId(): string {
  return "TXN-" + Math.floor(1000 + Math.random() * 9000);
}
