import { useEffect, useState } from "react";
import Modal from "./Modal";
import type {
  CartItem,
  Customer,
  Discount,
  HeldOrder,
} from "@/types/pos";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

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

function authHeaders(): HeadersInit {
  try {
    const token = localStorage.getItem("rhea_pos_auth_token");

    return token
      ? {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        }
      : {
          Accept: "application/json",
        };
  } catch {
    return {
      Accept: "application/json",
    };
  }
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
  const [viewOrder, setViewOrder] = useState<HeldOrder | null>(null);

  /*
  |--------------------------------------------------------------------------
  | FETCH HOLD NOTES DIRECTLY FROM API
  |--------------------------------------------------------------------------
  |
  | We don't depend on order.notes coming from the parent anymore.
  | The API already returns:
  |
  | {
  |   id: 6,
  |   hold_no: "...",
  |   notes: "Test"
  | }
  |
  | Store the notes by hold ID.
  |--------------------------------------------------------------------------
  */
  const [holdNotes, setHoldNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    const fetchHoldNotes = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/pos/holds.php`,
          {
            method: "GET",
            headers: authHeaders(),
            cache: "no-store",
          }
        );

        const text = await response.text();

        let data: any;

        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          console.warn(
            "Unable to parse hold notes response:",
            text
          );
          return;
        }

        if (!response.ok || !data.success) {
          console.warn(
            "Unable to fetch hold notes:",
            data?.message
          );
          return;
        }

        if (!mounted) return;

        const mappedNotes: Record<string, string> = {};

        if (Array.isArray(data.holds)) {
          data.holds.forEach((hold: any) => {
            const id = String(hold.id);

            mappedNotes[id] =
              hold.notes !== null &&
              hold.notes !== undefined
                ? String(hold.notes)
                : "";
          });
        }

        setHoldNotes(mappedNotes);
      } catch (err) {
        console.warn(
          "Fetch hold notes failed:",
          err
        );
      }
    };

    fetchHoldNotes();

    return () => {
      mounted = false;
    };
  }, []);

  const createHold = async () => {
    if (currentCart.length === 0 || !onCreateHold) return;

    try {
      setCreating(true);
      setError("");

      await onCreateHold(notes.trim());

      setNotes("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to hold order."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      title={`Held Orders (${heldOrders.length})`}
      onClose={onClose}
      width="max-w-lg"
    >
      {currentCart.length > 0 && onCreateHold && (
        <div className="px-5 pt-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-slate-900">
              Hold Current Cart
            </p>

            <p className="text-xs text-slate-500 mt-1">
              {currentCart.length} item
              {currentCart.length !== 1 ? "s" : ""} ·{" "}
              {currentCustomer?.name ?? "Walk-in"}
            </p>

            {currentDiscount && (
              <p className="text-[10px] text-emerald-700 mt-1">
                Discount:{" "}
                {currentDiscount.code ??
                  currentDiscount.name ??
                  "Applied"}
              </p>
            )}

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
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
              {creating
                ? "Saving Hold…"
                : "Hold This Order"}
            </button>
          </div>
        </div>
      )}

      {currentCart.length === 0 && (
        <div className="px-5 py-4 space-y-2.5 min-h-[80px]">
          {heldOrders.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">No held orders.</p>
            </div>
          ) : (
            heldOrders.map((order) => {
              const apiNote = holdNotes[String(order.id)];
              const displayNote = apiNote !== undefined ? apiNote.trim() : order.notes?.trim() || "";
              return (
                <div key={order.id} className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white hover:border-indigo-200 transition">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">NOTES:</p>
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap break-words">{displayNote || "No notes"}</p>
                      <p className="text-sm font-semibold text-slate-900 leading-tight mt-2">{order.label} · {order.customer?.name ?? "Walk-in"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{order.cart.length} item{order.cart.length !== 1 ? "s" : ""} · ₱{order.subtotal.toFixed(2)} · {timeStr(order.heldAt instanceof Date ? order.heldAt : new Date(order.heldAt))}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button type="button" onClick={() => setViewOrder(order)} className="h-8 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition">View</button>
                      <button type="button" onClick={() => onResume(order)} className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm">Resume</button>
                      <button type="button" onClick={() => onDelete(order.id)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-400 flex items-center justify-center transition" aria-label="Delete held order">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {viewOrder && (
        <Modal title="Held Order Details" onClose={() => setViewOrder(null)} width="max-w-lg">
          <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-900">{viewOrder.label} · {viewOrder.customer?.name ?? "Walk-in"}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-3">NOTES:</p>
              <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap break-words">{holdNotes[String(viewOrder.id)]?.trim() || viewOrder.notes?.trim() || "No notes"}</p>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2.5 bg-slate-50 border-b"><p className="text-xs font-bold text-slate-700">Products ({viewOrder.cart.length})</p></div>
              <div className="divide-y">
                {viewOrder.cart.map((item) => (
                  <div key={item.id} className="px-3 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p><p className="text-[10px] text-slate-400 mt-0.5">{item.sku}</p></div>
                    <div className="text-right flex-shrink-0"><p className="text-xs font-bold text-slate-800">×{item.qty}</p><p className="text-[10px] text-slate-400">₱{Number(item.price).toFixed(2)}</p></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3"><span className="text-xs font-semibold text-slate-600">Subtotal</span><span className="text-sm font-bold text-indigo-700">₱{viewOrder.subtotal.toFixed(2)}</span></div>
            <button type="button" onClick={() => setViewOrder(null)} className="w-full h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Close</button>
          </div>
        </Modal>
      )}

      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={onClose}
          className="w-full h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}