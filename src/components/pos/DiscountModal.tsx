import { useEffect, useState } from "react";
import Modal from "./Modal";
import type { Discount, DiscountType } from "@/types/pos";
import { posAuthHeaders } from "@/types/posToken";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

interface Props {
  current: Discount | null;
  subtotal: number;
  storeId: number;
  onApply: (discount: Discount | null) => void;
  onClose: () => void;
}

interface DiscountLookupResponse {
  success: boolean;
  message?: string;
  discount?: {
    id: number | string;
    name?: string | null;
    code: string;
    discount_type: string;
    value: number | string;
    scope?: string | null;
    min_order?: number | string | null;
    usage_count?: number | string | null;
    max_uses?: number | string | null;
    starts?: string | null;
    ends?: string | null;
  };
  discount_amount?: number;
  after_discount?: number;
}

function money(value: number) {
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeType(value: string): DiscountType | null {
  const type = value.trim().toLowerCase();

  if (type === "percentage" || type === "percent") {
    return "percentage";
  }

  if (type === "fixed" || type === "amount") {
    return "fixed";
  }

  return null;
}

export default function DiscountModal({
  current,
  subtotal,
  storeId,
  onApply,
  onClose,
}: Props) {
  const [code, setCode] = useState(current?.code ?? "");
  const [loading, setLoading] = useState(false);
  const [lookup, setLookup] = useState<DiscountLookupResponse["discount"] | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [afterDiscount, setAfterDiscount] = useState(subtotal);
  const [error, setError] = useState("");

  useEffect(() => {
    setCode(current?.code ?? "");
    setLookup(null);
    setDiscountAmount(0);
    setAfterDiscount(subtotal);
    setError("");
  }, [current, subtotal]);

  const handleApplyCode = async () => {
    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      setError("Please enter a discount code.");
      return;
    }

    if (!Number.isInteger(storeId) || storeId <= 0) {
      setError("Invalid store.");
      return;
    }

    setLoading(true);
    setError("");
    setLookup(null);
    setDiscountAmount(0);
    setAfterDiscount(subtotal);

    try {
      const response = await fetch(
        `${API_BASE}/pos/validate-discount.php`,
        {
          method: "POST",
          headers: posAuthHeaders(true),
          body: JSON.stringify({
            store_id: storeId,
            code: normalizedCode,
            subtotal,
          }),
        }
      );

      const data = await response.json() as DiscountLookupResponse;

      if (!response.ok || !data.success || !data.discount) {
        throw new Error(
          data.message || "Invalid discount code."
        );
      }

      const type = normalizeType(data.discount.discount_type);

      if (!type) {
        throw new Error("This discount has an unsupported discount type.");
      }

      setCode(data.discount.code);
      setLookup(data.discount);
      setDiscountAmount(Number(data.discount_amount || 0));
      setAfterDiscount(
        Number(
          data.after_discount ??
            Math.max(0, subtotal - Number(data.discount_amount || 0))
        )
      );
    } catch (err) {
      console.error("Discount validation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to validate discount code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!lookup) return;

    const type = normalizeType(lookup.discount_type);

    if (!type) {
      setError("This discount has an unsupported discount type.");
      return;
    }

    onApply({
      id: String(lookup.id),
      code: lookup.code,
      name: String(lookup.name ?? lookup.code),
      type,
      value: Number(lookup.value || 0),
      reason: String(lookup.name ?? lookup.code),
      scope: String(lookup.scope ?? ""),
      min_order: Number(lookup.min_order || 0),
    });

    onClose();
  };

  const handleRemove = () => {
    onApply(null);
    onClose();
  };

  return (
    <Modal title="Apply Discount" onClose={onClose} width="max-w-sm">
      <div className="px-6 py-5 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Discount Code
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setError("");
                setLookup(null);
                setDiscountAmount(0);
                setAfterDiscount(subtotal);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleApplyCode();
                }
              }}
              placeholder="Enter discount code"
              autoFocus
              disabled={loading}
              className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm uppercase font-semibold tracking-wide placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
            />

            <button
              type="button"
              onClick={() => void handleApplyCode()}
              disabled={loading || !code.trim()}
              className="h-11 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {loading ? "Checking…" : "Check"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {lookup && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  {lookup.name || lookup.code}
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5 font-mono">
                  {lookup.code}
                </p>
              </div>

              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-white/70 rounded-md px-2 py-1">
                Valid
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white/60 px-3 py-2">
                <p className="text-[10px] text-emerald-600">Discount</p>
                <p className="font-bold text-emerald-800">
                  {normalizeType(lookup.discount_type) === "percentage"
                    ? `${Number(lookup.value).toLocaleString("en-PH", {
                        maximumFractionDigits: 2,
                      })}%`
                    : money(Number(lookup.value || 0))}
                </p>
              </div>

              <div className="rounded-lg bg-white/60 px-3 py-2">
                <p className="text-[10px] text-emerald-600">Minimum Order</p>
                <p className="font-bold text-emerald-800">
                  {Number(lookup.min_order || 0) > 0
                    ? money(Number(lookup.min_order))
                    : "None"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 font-medium">
              <span>Discount</span>
              <span>- {money(discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-indigo-100">
            <span>After discount</span>
            <span className="text-indigo-600">
              {money(afterDiscount)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 px-6 pb-6">
        {current && (
          <button
            type="button"
            onClick={handleRemove}
            className="h-11 px-4 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition"
          >
            Remove
          </button>
        )}

        <button
          type="button"
          onClick={handleApply}
          disabled={!lookup || loading}
          className="flex-1 h-11 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm shadow-indigo-200"
        >
          Apply Discount
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
