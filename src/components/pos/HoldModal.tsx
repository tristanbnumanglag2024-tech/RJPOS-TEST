import { useState } from "react";
import Modal from "./Modal";
import type { CartItem, Customer, Discount, HeldOrder } from "@/types/pos";


interface Props {
  heldOrders: HeldOrder[];
  currentCart?: CartItem[];
  currentCustomer?: Customer | null;
  currentDiscount?: Discount | null;
  onCreateHold?: (notes: string) => Promise<void>;
  onResume: (order: HeldOrder) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onClose: () => void;
}

function timeStr(d: Date) {
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function HoldModal({
  heldOrders,
  currentCart = [],
  currentCustomer = null,
  currentDiscount = null,
  onCreateHold,
  onResume,
  onDelete,
  onClose,
}: Props) {
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const createHold = async () => {
    if (currentCart.length === 0 || !onCreateHold) return;

    try {
      setCreating(true);
      setError("");
      await onCreateHold(notes.trim());
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to hold order.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal title={`Held Orders (${heldOrders.length})`} onClose={onClose} width="max-w-lg">
      {currentCart.length > 0 && onCreateHold && (
        <div className="px-5 pt-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-slate-900">Hold Current Cart</p>
            <p className="text-xs text-slate-500 mt-1">
              {currentCart.length} item{currentCart.length !== 1 ? "s" : ""} ·{" "}
              {currentCustomer?.name ?? "Walk-in"}
            </p>
            {currentDiscount && (
              <p className="text-[10px] text-emerald-700 mt-1">
                Discount: {currentDiscount.code ?? currentDiscount.name ?? "Applied"}
              </p>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full mt-3 min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            {error && (
              <div className="mt-2 rounded-xl bg-white border border-red-200 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={createHold}
              disabled={creating}
              className="mt-3 w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold disabled:opacity-50"
            >
              {creating ? "Saving Hold…" : "Hold This Order"}
            </button>
          </div>
        </div>
      )}

      <div className="px-5 py-4 space-y-2.5 min-h-[80px]">
        {heldOrders.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="mx-auto mb-2 text-slate-200" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
            <p className="text-sm text-slate-400">No held orders.</p>
          </div>
        ) : (
          heldOrders.map((order) => (
            <div
              key={order.id}
              className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white hover:border-indigo-200 transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-tight">
                    {order.holdNo ?? order.label} · {order.customer?.name ?? "Walk-in"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {order.cart.length} item{order.cart.length !== 1 ? "s" : ""} · ₱
                    {order.subtotal.toFixed(2)} · {timeStr(order.heldAt)}
                  </p>
                  {order.notes && (
                    <p className="text-xs text-slate-500 mt-2">
                      Note: {order.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onResume(order)}
                    className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => onDelete(order.id)}
                    className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-400 flex items-center justify-center transition"
                    aria-label="Delete held order"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={onClose}
          className="w-full h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
