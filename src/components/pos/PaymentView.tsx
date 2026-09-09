import { useEffect, useMemo, useState } from "react";
import type { CartItem, Customer, Discount } from "@/types/pos";

export interface TaxConfig {
  id: number;
  name: string;
  code: string;
  rate: number;
  inclusive: boolean;
  applies: string;
}

export interface PaymentMethod {
  id: number;
  store_id: number;
  name: string;
  code: string;
  icon?: string | null;
  description?: string | null;
  enabled: boolean;
  processing_fee: number;
  fee_type: string;
  is_available: boolean;
  is_coming_soon: boolean;
  sort_order: number;
}

export interface PaymentPart {
  method: string;
  amount: number;
}

function calcTotals(cart: CartItem[], discount: Discount | null, taxConfig: TaxConfig) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmt = discount
    ? discount.type === "percentage"
      ? Math.min((subtotal * Math.max(0, discount.value)) / 100, subtotal)
      : Math.min(Math.max(0, discount.value), subtotal)
    : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmt);
  const tax = taxConfig.inclusive
    ? afterDiscount - afterDiscount / (1 + taxConfig.rate)
    : afterDiscount * taxConfig.rate;
  const total = taxConfig.inclusive ? afterDiscount : afterDiscount + tax;
  return { subtotal, discountAmt, afterDiscount, tax, total };
}

export default function PaymentView({
  cart,
  customer,
  discount,
  taxConfig,
  paymentMethods,
  onBack,
  onComplete,
}: {
  cart: CartItem[];
  customer: Customer | null;
  discount: Discount | null;
  taxConfig: TaxConfig;
  paymentMethods: PaymentMethod[];
  onBack: () => void;
  onComplete: (payments: PaymentPart[]) => Promise<void>;
}) {
  const { discountAmt, tax, total } = calcTotals(cart, discount, taxConfig);
  const [mode, setMode] = useState<"single" | "split">("single");
  const [method, setMethod] = useState<string>(paymentMethods[0]?.code ?? "");
  const [cashInput, setCashInput] = useState("");
  const [split, setSplit] = useState<PaymentPart[]>([
    { method: paymentMethods[0]?.code ?? "", amount: 0 },
    { method: paymentMethods[1]?.code ?? paymentMethods[0]?.code ?? "", amount: 0 },
  ]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (paymentMethods.length === 0) {
      setMethod("");
      setSplit([
        { method: "", amount: 0 },
        { method: "", amount: 0 },
      ]);
      return;
    }

    if (!paymentMethods.some((item) => item.code === method)) {
      setMethod(paymentMethods[0].code);
    }

    setSplit((current) =>
      current.map((part, index) => ({
        ...part,
        method:
          paymentMethods.some((item) => item.code === part.method)
            ? part.method
            : paymentMethods[index]?.code ?? paymentMethods[0].code,
      }))
    );
  }, [paymentMethods, method]);

  const cashVal = parseFloat(cashInput) || 0;
  const singleInsufficient =
    mode === "single" &&
    method === "cash" &&
    cashInput !== "" &&
    cashVal < total;

  const splitPaid = useMemo(
    () =>
      split.reduce(
        (sum, part) => sum + (Number(part.amount) || 0),
        0
      ),
    [split]
  );

  const splitDifference = Math.round((splitPaid - total) * 100) / 100;
  const splitValidMethods = split.every(
    (part) =>
      part.method !== "" &&
      paymentMethods.some((paymentMethod) => paymentMethod.code === part.method)
  );

  const singlePayments: PaymentPart[] =
    method === "cash"
      ? [{ method, amount: cashVal }]
      : [{ method, amount: total }];

  const canProcess =
    !processing &&
    cart.length > 0 &&
    paymentMethods.length > 0 &&
    (mode === "single"
      ? method !== "" &&
        (method !== "cash"
          ? true
          : cashInput !== "" && cashVal >= total)
      : splitValidMethods &&
        splitPaid >= total &&
        Math.abs(splitDifference) <= 0.01);

  const submit = async () => {
    if (!canProcess) return;

    setError("");

    try {
      setProcessing(true);
      await onComplete(
        mode === "single"
          ? singlePayments
          : split.map((part) => ({
              method: part.method,
              amount: Number(part.amount) || 0,
            }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process payment."
      );
    } finally {
      setProcessing(false);
    }
  };

  const taxPercent = (taxConfig.rate * 100).toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  });

  const taxLabel = taxConfig.inclusive
    ? `${taxConfig.name} (${taxPercent}% incl.)`
    : `${taxConfig.name} (${taxPercent}%)`;

  return (
    <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-slate-50 overflow-y-auto">
      <div className="w-full max-w-md mt-2 sm:mt-0">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Payment</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {customer?.name ?? "Walk-in Customer"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                Amount Due
              </p>
              <p className="text-2xl font-black text-indigo-600 tabular-nums">
                ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="px-5 sm:px-6 py-4 sm:py-5 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("single");
                  setError("");
                }}
                className={`h-10 rounded-xl border text-xs font-bold transition ${
                  mode === "single"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-600 hover:border-indigo-200"
                }`}
              >
                Single Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("split");
                  setError("");
                }}
                className={`h-10 rounded-xl border text-xs font-bold transition ${
                  mode === "split"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 text-slate-600 hover:border-indigo-200"
                }`}
              >
                Split Payment
              </button>
            </div>

            {mode === "single" ? (
              <>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Payment Method
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {paymentMethods.map((paymentMethod) => (
                      <button
                        type="button"
                        key={paymentMethod.id}
                        onClick={() => setMethod(paymentMethod.code)}
                        disabled={processing}
                        className={`h-11 rounded-xl text-xs font-semibold border transition ${
                          method === paymentMethod.code
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "text-slate-600 border-slate-200 hover:border-indigo-200"
                        }`}
                      >
                        {paymentMethod.name}
                      </button>
                    ))}
                  </div>
                </div>

                {method === "cash" ? (
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                      Cash Received
                    </p>
                    <input
                      type="number"
                      min="0"
                      value={cashInput}
                      onChange={(event) => setCashInput(event.target.value)}
                      disabled={processing}
                      placeholder={`₱${total.toFixed(2)}`}
                      className={`w-full h-12 px-4 rounded-xl border text-slate-900 text-base font-bold focus:outline-none focus:ring-2 transition ${
                        singleInsufficient
                          ? "border-red-300 bg-red-50 focus:ring-red-400"
                          : "border-slate-200 bg-slate-50 focus:ring-indigo-500"
                      }`}
                    />
                    {cashInput && !singleInsufficient && (
                      <div className="flex justify-between mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                        <span className="text-sm text-emerald-700">Change</span>
                        <span className="text-base font-bold text-emerald-700">
                          ₱{(cashVal - total).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                    {singleInsufficient && (
                      <p className="text-xs text-red-500 mt-2">
                        Insufficient — ₱{(total - cashVal).toFixed(2)} short.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-5 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      Confirm {paymentMethods.find((item) => item.code === method)?.name ?? method} payment
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Amount: ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  Split into 2 payments
                </p>
                {split.map((part, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-bold text-slate-600 mb-2">
                      Payment {index + 1}
                    </p>
                    <div className="grid grid-cols-[1fr_130px] gap-2">
                      <select
                        value={part.method}
                        disabled={processing}
                        onChange={(event) =>
                          setSplit((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, method: event.target.value }
                                : item
                            )
                          )
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {paymentMethods.map((paymentMethod) => (
                          <option key={paymentMethod.id} value={paymentMethod.code}>
                            {paymentMethod.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={part.amount || ""}
                        disabled={processing}
                        onChange={(event) =>
                          setSplit((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    amount: Number(event.target.value) || 0,
                                  }
                                : item
                            )
                          )
                        }
                        placeholder="Amount"
                        className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}

                <div
                  className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                    Math.abs(splitDifference) <= 0.01
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-amber-50 border-amber-100"
                  }`}
                >
                  <span className="text-xs font-semibold text-slate-600">
                    Split total
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">
                      ₱{splitPaid.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Due ₱{total.toFixed(2)}
                    </p>
                  </div>
                </div>
                {Math.abs(splitDifference) > 0.01 && (
                  <p className="text-xs text-amber-600">
                    Split payments must total exactly ₱{total.toFixed(2)}.
                  </p>
                )}
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-xs text-slate-600">
                  <span>{item.name} ×{item.qty}</span>
                  <span className="font-medium">
                    ₱{(item.price * item.qty).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {discountAmt > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>- ₱{discountAmt.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-400 pt-1.5 border-t border-slate-200">
                <span>{taxLabel}</span>
                <span>₱{tax.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={processing}
              className="flex-1 h-12 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition font-medium"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canProcess}
              className="flex-[2] h-12 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition shadow-sm"
            >
              {processing ? "Processing…" : "Process Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
