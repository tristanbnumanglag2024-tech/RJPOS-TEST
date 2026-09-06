import Modal from "./Modal";
import type { HeldOrder } from "@/types/pos";

interface Props {
  heldOrders: HeldOrder[];
  onResume: (order: HeldOrder) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function timeStr(d: Date) {
  return d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

export default function HoldModal({ heldOrders, onResume, onDelete, onClose }: Props) {
  return (
    <Modal title={`Held Orders (${heldOrders.length})`} onClose={onClose} width="max-w-sm">
      <div className="px-5 py-4 space-y-2.5 min-h-[80px]">
        {heldOrders.length === 0 ? (
          <div className="py-8 text-center">
            <svg className="mx-auto mb-2 text-slate-200" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
            <p className="text-sm text-slate-400">No held orders.</p>
          </div>
        ) : heldOrders.map((order) => (
          <div key={order.id}
            className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3.5 bg-white hover:border-indigo-200 transition">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {order.label} · {order.customer?.name ?? "Walk-in"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {order.cart.length} item{order.cart.length !== 1 ? "s" : ""} · ₱{order.subtotal.toFixed(2)} · {timeStr(order.heldAt)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => { onResume(order); onClose(); }}
                className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
              >
                Resume
              </button>
              <button
                onClick={() => onDelete(order.id)}
                className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-400 flex items-center justify-center transition"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 pb-5">
        <button onClick={onClose}
          className="w-full h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
          Close
        </button>
      </div>
    </Modal>
  );
}
