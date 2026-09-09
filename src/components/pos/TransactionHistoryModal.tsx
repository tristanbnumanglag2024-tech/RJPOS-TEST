import { useEffect, useState } from "react";
import Modal from "@/components/pos/Modal";
import { posAuthHeaders } from "@/types/posToken";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

type Transaction = {
  id: number;
  receipt_no: string;
  cashier_name: string;
  customer_name: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string;
  amount_paid: number;
  status: string;
  refund_status: string;
  created_at: string;
  payments?: { method: string; amount: number }[];
};

type TransactionItem = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  refunded_quantity: number;
  refundable_quantity: number;
  unit_price: number;
  line_total: number;
};

type TransactionDetail = Transaction & {
  items: TransactionItem[];
  payments: { method: string; amount: number }[];
};

export default function TransactionHistoryModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<TransactionDetail | null>(null);
  const [refundItemQty, setRefundItemQty] = useState<Record<number, number>>({});
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const query = new URLSearchParams();
      if (dateFrom) query.set("date_from", dateFrom);
      if (dateTo) query.set("date_to", dateTo);
      if (receiptNo.trim()) query.set("receipt_no", receiptNo.trim());

      const response = await fetch(
        `${API_BASE}/pos/transactions.php${query.toString() ? `?${query}` : ""}`,
        {
          headers: posAuthHeaders(),
          cache: "no-store",
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load transactions.");
      }

      setRows(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Mobile keyboard support: when the keyboard opens, keep the active field
  // visible and let the modal content use the available visual viewport.
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const keepFocusedFieldVisible = () => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        window.setTimeout(() => {
          active.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }, 80);
      }
    };

    viewport.addEventListener("resize", keepFocusedFieldVisible);
    viewport.addEventListener("scroll", keepFocusedFieldVisible);
    window.addEventListener("resize", keepFocusedFieldVisible);

    return () => {
      viewport.removeEventListener("resize", keepFocusedFieldVisible);
      viewport.removeEventListener("scroll", keepFocusedFieldVisible);
      window.removeEventListener("resize", keepFocusedFieldVisible);
    };
  }, []);

  const openDetail = async (id: number) => {
    try {
      setRefundMessage("");
      setError("");
      const response = await fetch(`${API_BASE}/pos/transaction.php?id=${id}`, {
        headers: posAuthHeaders(),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load transaction.");
      }
      setSelected(data.transaction);
      setRefundItemQty({});
      setRefundReason("");
      setRefundNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load transaction.");
    }
  };

  // Refund window:
  // Show Refund for transactions purchased today through 7 calendar days ago.
  // Do not depend on the exact timezone/UTC format returned by MySQL.
  const getRefundPurchaseDate = (createdAt: string) => {
    const raw = String(createdAt ?? "").trim();
    if (!raw) return null;

    // MySQL commonly returns: YYYY-MM-DD HH:mm:ss
    // Convert it to a browser-safe ISO-like local date string.
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
      const fallback = new Date(raw);
      return Number.isNaN(fallback.getTime()) ? null : fallback;
    }

    return parsed;
  };

  const isWithinRefundWindow = (createdAt: string) => {
    const purchaseDate = getRefundPurchaseDate(createdAt);
    if (!purchaseDate) {
      // Keep the action visible rather than accidentally hiding every refund
      // because of a database date-format difference.
      return true;
    }

    const today = new Date();

    // Compare calendar dates, not hours. This means a transaction made today
    // is refundable, and it remains refundable through the 7th day.
    const purchaseDay = new Date(
      purchaseDate.getFullYear(),
      purchaseDate.getMonth(),
      purchaseDate.getDate()
    );

    const todayDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const ageInDays = Math.floor(
      (todayDay.getTime() - purchaseDay.getTime()) /
        (24 * 60 * 60 * 1000)
    );

    return ageInDays >= 0 && ageInDays <= 7;
  };

  const canRequestRefund = (transaction: Transaction) => {
    const refundStatus = String(transaction.refund_status ?? "")
      .trim()
      .toLowerCase();

    // Do not allow another refund request while one is pending,
    // and do not show Refund again for a rejected request.
    // This prevents duplicate refund requests from Transaction History.
    if (["pending", "rejected", "refunded"].includes(refundStatus)) {
      return false;
    }

    return isWithinRefundWindow(transaction.created_at);
  };

  const refundable = selected
    ? canRequestRefund(selected) &&
      selected.items.some((item) => item.refundable_quantity > 0)
    : false;

  const submitRefund = async () => {
    if (!selected || !refundReason.trim()) {
      setRefundMessage("Please select a reason.");
      return;
    }

    const items = Object.entries(refundItemQty)
      .map(([saleItemId, quantity]) => ({
        sale_item_id: Number(saleItemId),
        quantity: Number(quantity),
      }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      setRefundMessage("Select at least one quantity to refund.");
      return;
    }

    try {
      setRefundLoading(true);
      setRefundMessage("");

      const response = await fetch(`${API_BASE}/pos/refund-request.php`, {
        method: "POST",
        headers: posAuthHeaders(true),
        body: JSON.stringify({
          sale_id: selected.id,
          reason: refundReason.trim(),
          notes: refundNotes.trim() || null,
          items,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to submit refund request.");
      }

      const successMessage = `Refund request ${data.request_no ?? ""} submitted for approval.`;
      await load();

      // Close the transaction/refund detail and return to Transaction History.
      setSelected(null);
      setRefundItemQty({});
      setRefundReason("");
      setRefundNotes("");
      setRefundMessage(successMessage);
    } catch (err) {
      setRefundMessage(
        err instanceof Error ? err.message : "Unable to submit refund request."
      );
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <Modal
      title={selected ? `Transaction ${selected.receipt_no}` : "Transaction History"}
      onClose={() => {
        if (selected) {
          setSelected(null);
        } else {
          onClose();
        }
      }}
      width="max-w-5xl w-full sm:w-auto"
    >
      {!selected ? (
        <div className="p-2.5 sm:p-4 space-y-3 sm:space-y-4 max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 px-3 text-base sm:text-xs bg-white min-w-0"
              aria-label="Date from"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 px-3 text-base sm:text-xs bg-white min-w-0"
              aria-label="Date to"
            />
            <input
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") load();
              }}
              placeholder="Search receipt no."
              className="h-11 rounded-xl border border-slate-200 px-3 text-base sm:text-xs bg-white min-w-0"
            />
            <button
              type="button"
              onClick={load}
              className="h-11 rounded-xl bg-indigo-600 text-white text-sm sm:text-xs font-bold"
            >
              Search
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {refundMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
              {refundMessage}
            </div>
          )}

          {/* Desktop/tablet transaction history */}
          <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[850px] w-full">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="text-left px-4 py-3">Receipt</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Cashier</th>
                    <th className="text-left px-4 py-3">Payment</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="py-10 text-center text-xs text-slate-400">Loading transactions…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-xs text-slate-400">No transactions found.</td></tr>
                  ) : rows.map((row) => {
                    const displayStatus = String(row.refund_status !== "none" ? row.refund_status : row.status).trim().toLowerCase();
                    const statusClass =
                      displayStatus === "refunded" ? "bg-emerald-100 text-emerald-700" :
                      displayStatus === "rejected" ? "bg-red-100 text-red-700" :
                      displayStatus === "pending" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600";
                    return (
                      <tr key={row.id} className="text-xs text-slate-600">
                        <td className="px-4 py-3 font-semibold text-slate-900 break-all">{row.receipt_no}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(row.created_at).toLocaleString("en-PH")}</td>
                        <td className="px-4 py-3">{row.cashier_name}</td>
                        <td className="px-4 py-3 capitalize">{row.payment_method === "split" ? "Split Payment" : row.payment_method}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">₱{row.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold capitalize ${statusClass}`}>{displayStatus}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => openDetail(row.id)} className="h-9 px-3 rounded-lg bg-slate-100 text-slate-700 font-semibold whitespace-nowrap">View</button>
                            {canRequestRefund(row) && (
                              <button type="button" onClick={() => openDetail(row.id)} className="h-9 px-3 rounded-lg bg-amber-50 text-amber-700 font-semibold whitespace-nowrap">Refund</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile transaction cards */}
          <div className="sm:hidden space-y-2">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-xs text-slate-400">Loading transactions…</div>
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-10 text-center text-xs text-slate-400">No transactions found.</div>
            ) : rows.map((row) => {
              const displayStatus = String(row.refund_status !== "none" ? row.refund_status : row.status).trim().toLowerCase();
              const statusClass =
                displayStatus === "refunded" ? "bg-emerald-100 text-emerald-700" :
                displayStatus === "rejected" ? "bg-red-100 text-red-700" :
                displayStatus === "pending" ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-600";
              return (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 break-all leading-5">{row.receipt_no}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(row.created_at).toLocaleString("en-PH")}</p>
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-1 rounded-full text-[10px] font-semibold capitalize ${statusClass}`}>{displayStatus}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="rounded-xl bg-slate-50 p-2 min-w-0">
                      <p className="text-[9px] uppercase tracking-wide text-slate-400">Cashier</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-700 truncate">{row.cashier_name}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2 min-w-0">
                      <p className="text-[9px] uppercase tracking-wide text-slate-400">Payment</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-700 capitalize truncate">{row.payment_method === "split" ? "Split Payment" : row.payment_method}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <p className="text-base font-black text-slate-900">₱{row.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openDetail(row.id)} className="h-10 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">View</button>
                      {canRequestRefund(row) && (
                        <button type="button" onClick={() => openDetail(row.id)} className="h-10 px-4 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold">Refund</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-2.5 sm:p-4 space-y-3 sm:space-y-4 max-h-[calc(100dvh-5.5rem)] sm:max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] text-slate-400">Receipt</p>
              <p className="text-xs font-bold text-slate-900 mt-1">{selected.receipt_no}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] text-slate-400">Date</p>
              <p className="text-xs font-bold text-slate-900 mt-1">
                {new Date(selected.created_at).toLocaleString("en-PH")}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] text-slate-400">Cashier</p>
              <p className="text-xs font-bold text-slate-900 mt-1">{selected.cashier_name}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[10px] text-slate-400">Total</p>
              <p className="text-sm font-black text-indigo-600 mt-1">
                ₱{selected.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Desktop/tablet transaction items */}
          <div className="hidden sm:block border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-right px-4 py-3">Sold</th>
                  <th className="text-right px-4 py-3">Refunded</th>
                  <th className="text-right px-4 py-3">Available</th>
                  <th className="text-right px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selected.items.map((item) => (
                  <tr key={item.id} className="text-xs">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900 break-words">{item.product_name}</p><p className="text-[10px] text-slate-400 break-all">{item.sku}</p></td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{item.refunded_quantity}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{item.refundable_quantity}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">₱{item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile transaction items */}
          <div className="sm:hidden space-y-2">
            {selected.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 break-words">{item.product_name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 break-all">{item.sku}</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-slate-900">₱{item.line_total.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="rounded-xl bg-slate-50 p-2"><p className="text-[9px] text-slate-400">Sold</p><p className="text-xs font-bold text-slate-700 mt-0.5">{item.quantity}</p></div>
                  <div className="rounded-xl bg-slate-50 p-2"><p className="text-[9px] text-slate-400">Refunded</p><p className="text-xs font-bold text-slate-700 mt-0.5">{item.refunded_quantity}</p></div>
                  <div className="rounded-xl bg-indigo-50 p-2"><p className="text-[9px] text-indigo-400">Available</p><p className="text-xs font-bold text-indigo-700 mt-0.5">{item.refundable_quantity}</p></div>
                </div>
              </div>
            ))}
          </div>

          {refundable && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Request Refund</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select the quantity to return. A manager/admin must approve the request.
                </p>
              </div>

              {selected.items.map((item) =>
                item.refundable_quantity > 0 ? (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {item.product_name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Up to {item.refundable_quantity}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={item.refundable_quantity}
                      value={refundItemQty[item.id] ?? 0}
                      onChange={(e) =>
                        setRefundItemQty((current) => ({
                          ...current,
                          [item.id]: Math.min(
                            item.refundable_quantity,
                            Math.max(0, Number(e.target.value) || 0)
                          ),
                        }))
                      }
                      className="w-20 sm:w-24 h-11 rounded-xl border border-slate-200 px-2 sm:px-3 text-base sm:text-sm text-right shrink-0"
                    />
                  </div>
                ) : null
              )}

              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-base sm:text-xs bg-white"
              >
                <option value="">Select refund reason</option>
                <option value="Customer return">Customer return</option>
                <option value="Wrong item">Wrong item</option>
                <option value="Damaged item">Damaged item</option>
                <option value="Incorrect charge">Incorrect charge</option>
                <option value="Other">Other</option>
              </select>

              <textarea
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full min-h-28 rounded-xl border border-slate-200 px-3 py-2 text-base sm:text-xs bg-white resize-none"
              />

              {refundMessage && (
                <div className="rounded-xl bg-white border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  {refundMessage}
                </div>
              )}

              <button
                type="button"
                disabled={refundLoading}
                onClick={submitRefund}
                className="w-full h-10 rounded-xl bg-amber-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {refundLoading ? "Submitting…" : "Submit Refund Request"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
