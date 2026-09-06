import { useMemo, useState } from "react";
import type { CartItem, Product } from "@/types/pos";

interface Props {
  products: Product[];
  cart: CartItem[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSetQty: (id: string, qty: number) => void;
}

function abbr(name: string) {
  const words = name
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .filter(Boolean);

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="text-[9px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-md px-1.5 py-0.5">
        OUT
      </span>
    );
  }

  if (stock <= 5) {
    return (
      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-1.5 py-0.5">
        LOW {stock}
      </span>
    );
  }

  return (
    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-1.5 py-0.5">
      {stock}
    </span>
  );
}

const PALETTE = [
  { bg: "bg-violet-50", text: "text-violet-600" },
  { bg: "bg-blue-50", text: "text-blue-600" },
  { bg: "bg-emerald-50", text: "text-emerald-600" },
  { bg: "bg-amber-50", text: "text-amber-600" },
  { bg: "bg-pink-50", text: "text-pink-600" },
  { bg: "bg-cyan-50", text: "text-cyan-600" },
];

export default function ProductGrid({
  products,
  cart,
  onAdd,
  onRemove,
  onSetQty,
}: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(
        products
          .map((product) => product.category?.trim())
          .filter(Boolean)
      )
    );

    return ["All", ...values.sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchCategory =
        category === "All" || product.category === category;

      const matchSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        String(
          (product as Product & { barcode?: string | null }).barcode ?? ""
        )
          .toLowerCase()
          .includes(q);

      return matchCategory && matchSearch;
    });
  }, [products, search, category]);

  const getQty = (id: string) =>
    cart.find((item) => item.id === id)?.qty ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
      <div className="px-3 sm:px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, SKU, or barcode…"
            className="w-full h-10 pl-9 pr-9 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 px-3 sm:px-4 py-2 overflow-x-auto border-b border-slate-100 flex-shrink-0 scrollbar-none">
        {categories.map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 h-8 px-3 rounded-full text-xs font-semibold transition whitespace-nowrap ${
              category === cat
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 active:bg-slate-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50">
        {filtered.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-300">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p className="text-sm">
              {products.length === 0
                ? "No active products in this store."
                : "No products found."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3">
            {filtered.map((product, index) => {
              const qty = getQty(product.id);
              const isSelected = qty > 0;
              const isOut = product.stock <= 0;
              const palette = PALETTE[index % PALETTE.length];

              return (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => {
                    if (!isOut) onAdd(product.id);
                  }}
                  disabled={isOut}
                  className={`relative flex flex-col rounded-xl sm:rounded-2xl border-2 overflow-hidden text-left transition-all duration-150 active:scale-[0.96] disabled:cursor-default group ${
                    isSelected
                      ? "border-indigo-500 shadow-md shadow-indigo-100"
                      : "border-transparent hover:border-slate-200 hover:shadow-sm"
                  } ${isOut ? "opacity-60" : ""}`}
                >
                  <div
                    className={`${palette.bg} flex items-center justify-center py-5 sm:py-7 w-full`}
                  >
                    <span
                      className={`text-2xl sm:text-3xl font-black tracking-tight ${palette.text}`}
                    >
                      {abbr(product.name)}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center shadow-sm">
                      <span className="text-[9px] font-bold text-white">
                        {qty}
                      </span>
                    </div>
                  )}

                  <div className="bg-white px-2 pt-2 pb-2 flex-1 flex flex-col gap-0.5">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-800 leading-snug line-clamp-2">
                      {product.name}
                    </p>

                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-mono uppercase">
                      {product.sku || "NO SKU"}
                    </p>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] sm:text-xs font-bold text-indigo-600">
                        ₱{product.price.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <StockBadge stock={product.stock} />
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute bottom-[46px] sm:bottom-[52px] left-0 right-0 hidden sm:flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1 bg-white/95 border border-indigo-100 rounded-full px-2 py-1 shadow-sm">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemove(product.id);
                          }}
                          className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                        >
                          −
                        </button>

                        <input
                          type="number"
                          min="1"
                          max={Math.max(1, product.stock)}
                          value={qty}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => {
                            event.stopPropagation();
                            const value = Number(event.target.value);
                            if (
                              Number.isInteger(value) &&
                              value >= 1
                            ) {
                              onSetQty(
                                product.id,
                                Math.min(value, product.stock)
                              );
                            }
                          }}
                          onFocus={(event) => {
                            event.stopPropagation();
                            event.target.select();
                          }}
                          className="w-10 text-xs font-bold text-slate-800 text-center bg-transparent border-none outline-none tabular-nums"
                        />

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (qty < product.stock) {
                              onAdd(product.id);
                            }
                          }}
                          disabled={qty >= product.stock}
                          className="w-5 h-5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
