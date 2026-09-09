import type { CartItem, Customer, Discount } from "@/types/pos";
import { CATEGORY_PALETTE } from "@/data/mockData";
import { useRef } from "react";

interface Props {
  txnId: string;
  cart: CartItem[];
  customer: Customer | null;
  discount: Discount | null;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSetQty: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClear: () => void;
  onCustomer: () => void;
  onDiscount: () => void;
  onHold: () => void;
  onCheckout: () => void;
  /** Mobile drawer: when present, show a close (×) button in the header */
  onClose?: () => void;
  taxRate: number;
  taxInclusive: boolean;
  taxLabel: string;
}

function abbr(name: string) {
  return name.replace(/[^a-zA-Z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function CartPanel({
  txnId, cart, customer, discount,
  onAdd, onRemove, onSetQty, onRemoveItem, onClear,
  onCustomer, onDiscount, onHold, onCheckout,
  onClose,
  taxRate,
  taxInclusive,
  taxLabel,
}: Props) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmount = discount
    ? discount.type === "percentage"
      ? (subtotal * discount.value) / 100
      : Math.min(discount.value, subtotal)
    : 0;
  const afterDiscount = subtotal - discountAmount;
  const tax = taxInclusive
    ? afterDiscount - afterDiscount / (1 + taxRate)
    : afterDiscount * taxRate;
  const total = taxInclusive
    ? afterDiscount
    : afterDiscount + tax;

  // Mobile-only swipe-down gesture for the cart drawer.
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onClose || window.innerWidth >= 768) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onClose || window.innerWidth >= 768) return;

    const startY = touchStartY.current;
    const startX = touchStartX.current;
    touchStartY.current = null;
    touchStartX.current = null;

    if (startY === null || startX === null) return;

    const deltaY = e.changedTouches[0].clientY - startY;
    const deltaX = e.changedTouches[0].clientX - startX;

    if (deltaY >= 70 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
      onClose();
    }
  };

  return (
    <div
      className="flex flex-col bg-white h-full"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile swipe handle */}
      {onClose && (
        <div className="md:hidden flex justify-center pt-2 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
      )}

      {/* Header */}
      <div className="px-3.5 sm:px-4 pt-2.5 sm:pt-3.5 pb-2 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mobile back/close button */}
            {onClose && (
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition text-slate-500 flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
            )}
            <span className="text-xs font-bold text-slate-400 font-mono tracking-wider">{txnId}</span>
          </div>
          {cart.length > 0 && (
            <button onClick={onClear} className="text-xs font-semibold text-red-400 hover:text-red-600 transition">Clear</button>
          )}
        </div>
        <button onClick={onCustomer} className="mt-1 text-xs font-medium text-indigo-500 hover:text-indigo-700 transition text-left flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>
          {customer ? customer.name : "Walk-in Customer"}
        </button>
      </div>

      {/* Cart items */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {cart.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-slate-300 px-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {cart.map((item) => {
              const palette = CATEGORY_PALETTE[item.category] ?? CATEGORY_PALETTE["Office Supplies"];
              return (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-full ${palette.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-[11px] font-black ${palette.text}`}>{abbr(item.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-1">{item.name}</p>
                        <button onClick={() => onRemoveItem(item.id)}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-300 hover:text-slate-500 transition mt-0.5">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">₱{item.price.toLocaleString()} each</p>
                    </div>
                  </div>
                  {/* Qty row — editable for wholesale */}
                  <div className="flex items-center justify-between mt-2 pl-[46px]">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onRemove(item.id)}
                        className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center transition text-slate-500 flex-shrink-0 touch-manipulation">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                      <input
                        type="number" min="1" max="9999"
                        value={item.qty}
                        onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 1) onSetQty(item.id, v); }}
                        onFocus={(e) => e.target.select()}
                        className="w-14 h-8 rounded-lg border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                      />
                      <button onClick={() => onAdd(item.id)}
                        className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 flex items-center justify-center transition text-white flex-shrink-0 touch-manipulation">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                    </div>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">₱{(item.price * item.qty).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="border-t border-slate-100 px-4 py-3 space-y-1.5 flex-shrink-0">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Subtotal</span>
          <span className="tabular-nums">₱{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        </div>
        {discount && discountAmount > 0 && (
          <div className="flex justify-between text-xs text-emerald-600 font-medium">
            <span>Discount {discount.type === "percentage" ? `(${discount.value}%)` : ""}</span>
            <span className="tabular-nums">- ₱{discountAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-slate-500">
          <span>{taxLabel}</span>
          <span className="tabular-nums">₱{tax.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-slate-100">
          <span className="text-sm font-bold text-slate-900">TOTAL</span>
          <span className="text-lg font-black text-indigo-600 tabular-nums">₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Action row */}
      <div className="border-t border-slate-100 grid grid-cols-3 divide-x divide-slate-100 flex-shrink-0">
        {[
          {
            label: "Customer",
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>,
            onClick: onCustomer, active: !!customer,
          },
          {
            label: "Discount",
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
            onClick: onDiscount, active: !!discount,
          },
          {
            label: "Hold",
            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>,
            onClick: onHold, active: false,
          },
        ].map(({ label, icon, onClick, active }) => (
          <button key={label} onClick={onClick}
            className={`flex flex-col items-center justify-center py-3 gap-1 text-[11px] font-semibold transition touch-manipulation ${
              active ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-700 hover:bg-slate-50 active:bg-slate-100"
            }`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* PAY button */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full h-13 sm:h-12 h-12 rounded-xl bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition flex items-center justify-center gap-2.5 shadow-sm shadow-indigo-300 touch-manipulation"
          style={{ minHeight: 48 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          PAY ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </button>
      </div>
    </div>
  );
}
