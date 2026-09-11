  import { useEffect, useState } from "react";
  import type {
    POSSession,
    CartItem,
    Customer,
    Discount,
    HeldOrder,
    POSView,
    Product,
  } from "@/types/pos";
  import { generateTxnId } from "@/data/mockData";
  import { posAuthHeaders } from "@/types/posToken";
  import POSHeader from "@/components/pos/POSHeader";
  import ProductGrid from "@/components/pos/ProductGrid";
  import CartPanel from "@/components/pos/CartPanel";
  import CustomerModal from "@/components/pos/CustomerModal";
  import DiscountModal from "@/components/pos/DiscountModal";
  import HoldModal from "@/components/pos/HoldModal";
import PaymentView, { type PaymentPart } from "@/components/pos/PaymentView";
import TransactionHistoryModal from "@/components/pos/TransactionHistoryModal";
import RefundApprovalModal from "@/components/pos/RefundApprovalModal";

import { API_BASE } from "@/config/api";

  interface TaxConfig {
    id: number;
    name: string;
    code: string;
    rate: number;
    inclusive: boolean;
    applies: string;
  }

  interface PaymentMethod {
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

  interface PosDataResponse {
    success: boolean;
    message?: string;
    products?: Array<{
      id: number | string;
      name: string;
      sku?: string | null;
      barcode?: string | null;
      price: number | string;
      stock: number | string;
      category_name?: string | null;
    }>;
    customers?: Array<{
      id: number | string;
      name: string;
      email?: string | null;
      phone?: string | null;
      points?: number | string;
    }>;
    payment_methods?: PaymentMethod[];
    tax?: {
      id: number | string;
      name?: string | null;
      code?: string | null;
      rate?: number | string;
      inclusive?: boolean | number | string;
      applies?: string | null;
    } | null;
  }

  interface CompleteSaleResponse {
    success: boolean;
    message?: string;
    receipt_no?: string;
    sale_id?: number;
    subtotal?: number;
    discount?: number;
    tax?: number;
    total?: number;
    change?: number;
  }

  function toBoolean(value: unknown): boolean {
    if (value === true || value === 1) return true;
    const normalized = String(value ?? "").toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  function getTaxLabel(tax: TaxConfig) {
    const percent = (tax.rate * 100).toLocaleString("en-PH", {
      maximumFractionDigits: 2,
    });

    return tax.inclusive
      ? `${tax.name} (${percent}% incl.)`
      : `${tax.name} (${percent}%)`;
  }

  function calcTotals(
    cart: CartItem[],
    discount: Discount | null,
    taxConfig: TaxConfig
  ) {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    const discountAmt = discount
      ? discount.type === "percentage"
        ? Math.min(
            (subtotal * Math.max(0, discount.value)) / 100,
            subtotal
          )
        : Math.min(
            Math.max(0, discount.value),
            subtotal
          )
      : 0;

    const afterDiscount =
      Math.max(0, subtotal - discountAmt);

    const tax = taxConfig.inclusive
      ? afterDiscount -
        afterDiscount / (1 + taxConfig.rate)
      : afterDiscount * taxConfig.rate;

    const total = taxConfig.inclusive
      ? afterDiscount
      : afterDiscount + tax;

    return {
      subtotal,
      discountAmt,
      afterDiscount,
      tax,
      total,
    };
  }

  async function readJson<T>(
    response: Response
  ): Promise<T> {
    const text = await response.text();

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(
        text.trim().startsWith("<")
          ? "The server returned HTML instead of JSON."
          : `The server returned an invalid response: ${text.substring(
              0,
              250
            )}`
      );
    }
  }

  function mapProduct(
    product: NonNullable<PosDataResponse["products"]>[number]
  ): Product {
    return {
      id: String(product.id),
      name: String(product.name),
      sku: String(product.sku ?? ""),
      price: Number(product.price || 0),
      category:
        String(product.category_name ?? "").trim() ||
        "Uncategorized",
      stock: Math.max(
        0,
        Number(product.stock || 0)
      ),
    };
  }

  function mapCustomer(
    customer: NonNullable<
      PosDataResponse["customers"]
    >[number]
  ): Customer {
    return {
      id: String(customer.id),
      name: String(customer.name),
      phone: String(customer.phone ?? ""),
      email: String(customer.email ?? ""),
      points: Number(customer.points || 0),
    };
  }
  function ReceiptView({
    session,
    cart,
    customer,
    discount,
    taxConfig,
    paid,
    method,
    txnId,
    receiptNo,
    onNewSale,
  }: {
    session: POSSession;
    cart: CartItem[];
    customer: Customer | null;
    discount: Discount | null;
    taxConfig: TaxConfig;
    paid: number;
    method: string;
    txnId: string;
    receiptNo: string;
    onNewSale: () => void;
  }) {
    const {
      subtotal,
      discountAmt,
      tax,
      total,
    } = calcTotals(
      cart,
      discount,
      taxConfig
    );

    const change = paid - total;

    const now = new Date();

    const dateStr =
      now.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

    return (
      <div className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-sm mt-2 sm:mt-0">
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto mb-3">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              Payment Successful
            </h2>

            <p className="text-sm text-slate-400 mt-0.5">
              {dateStr}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-900 px-5 py-4 text-center">
              <p className="text-sm font-bold text-white">
                {session.store.name}
              </p>

              <p className="text-xs text-slate-400 mt-0.5">
                {session.store.branch} ·{" "}
                {session.store.address}
              </p>

              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                {receiptNo ||
                  txnId}{" "}
                · {session.store.terminal}
              </p>
            </div>

            <div className="px-5 py-4 space-y-2">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-slate-600">
                    {item.name}{" "}
                    <span className="text-slate-400">
                      ×{item.qty}
                    </span>
                  </span>

                  <span className="font-medium text-slate-900">
                    ₱
                    {(
                      item.price *
                      item.qty
                    ).toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-200 px-5 py-4 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal</span>
                <span>
                  ₱{subtotal.toFixed(2)}
                </span>
              </div>

              {discountAmt > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>
                    - ₱
                    {discountAmt.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-400">
                <span>
                  {getTaxLabel(
                    taxConfig
                  )}
                </span>
                <span>
                  ₱{tax.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>TOTAL</span>
                <span className="text-indigo-600">
                  ₱{total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-sm text-slate-500">
                <span className="capitalize">
                  {method === "split"
                    ? "Split Payment"
                    : method === "gcash"
                    ? "GCash"
                    : method === "qr"
                    ? "QR Code"
                    : method}
                </span>

                <span>
                  ₱{paid.toFixed(2)}
                </span>
              </div>

              {method === "cash" &&
                change >= 0 && (
                  <div className="flex justify-between text-sm font-semibold text-emerald-600">
                    <span>Change</span>
                    <span>
                      ₱{change.toFixed(2)}
                    </span>
                  </div>
                )}
            </div>

            <div className="border-t border-dashed border-slate-200 px-5 py-3 text-center">
              <p className="text-xs text-slate-400">
                Customer:{" "}
                {customer?.name ??
                  "Walk-in"}
              </p>

              <p className="text-xs text-slate-400 mt-0.5">
                Cashier:{" "}
                {session.user.name}
              </p>

              <p className="text-xs text-slate-300 mt-2">
                Thank you for shopping at Rhea Mart!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNewSale}
            className="w-full h-12 mt-5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-bold transition shadow-sm shadow-indigo-200"
          >
            + New Sale
          </button>
        </div>
      </div>
    );
  }

  function FloatingCartBar({
    cart,
    discount,
    heldOrders,
    onOpen,
  }: {
    cart: CartItem[];
    discount: Discount | null;
    heldOrders: HeldOrder[];
    onOpen: () => void;
  }) {
    const itemCount = cart.reduce(
      (sum, item) => sum + item.qty,
      0
    );

    if (
      itemCount === 0 &&
      heldOrders.length === 0
    ) {
      return null;
    }

    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 px-3 pb-4 pt-2 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none">
        <button
          type="button"
          onClick={onOpen}
          className="pointer-events-auto w-full h-14 rounded-2xl bg-indigo-700 text-white flex items-center justify-between px-5 shadow-xl shadow-indigo-900/30 active:bg-indigo-800 transition"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <line
                  x1="3"
                  y1="6"
                  x2="21"
                  y2="6"
                />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>

              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-white text-indigo-700 text-[9px] font-black flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </div>

            <span className="text-sm font-semibold">
              {itemCount > 0
                ? `${itemCount} item${
                    itemCount !== 1
                      ? "s"
                      : ""
                  }`
                : `${heldOrders.length} held`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {itemCount > 0 && (
              <span className="text-base font-black tabular-nums">
                Cart
              </span>
            )}

            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </button>
      </div>
    );
  }

  interface Props {
    session: POSSession;
    onLock: () => void;
    onLogout: () => void;
  }

  export default function POSScreen({
    session,
    onLock,
    onLogout,
  }: Props) {
    const [view, setView] =
      useState<POSView>("cart");

    const [products, setProducts] =
      useState<Product[]>([]);

    const [customers, setCustomers] =
      useState<Customer[]>([]);

    const [paymentMethods, setPaymentMethods] =
      useState<PaymentMethod[]>([]);

    const [taxConfig, setTaxConfig] =
      useState<TaxConfig>({
        id: 1,
        name: "Tax",
        code: "TAX",
        rate: 0,
        inclusive: false,
        applies: "sale",
      });

    const [loadingData, setLoadingData] =
      useState(true);

    const [dataError, setDataError] =
      useState("");

    const [cart, setCart] =
      useState<CartItem[]>(
        session.cart
      );

    const [customer, setCustomer] =
      useState<Customer | null>(
        session.customer
      );

    const [discount, setDiscount] =
      useState<Discount | null>(
        session.discount
      );

    const [heldOrders, setHeldOrders] =
      useState<HeldOrder[]>(
        session.heldOrders
      );

    const [txnId, setTxnId] =
      useState(session.txnId);

    const [receiptNo, setReceiptNo] =
      useState("");

    const [paid, setPaid] = useState(0);
    const [method, setMethod] =
      useState<string>("cash");

    const [showMobileCart, setShowMobileCart] =
      useState(false);

    const [showCustomer, setShowCustomer] =
      useState(false);

    const [showDiscount, setShowDiscount] =
      useState(false);

    const [showHold, setShowHold] =
      useState(false);

    const [showTransactions, setShowTransactions] =
      useState(false);

    const [showRefundApprovals, setShowRefundApprovals] =
      useState(false);

    const [actionError, setActionError] =
      useState("");

    const subtotal =
      cart.reduce(
        (sum, item) =>
          sum + item.price * item.qty,
        0
      );

    // Header receives the live heldOrders array, so the hold notification
    // updates immediately after a cart is placed on hold.
    const liveSession: POSSession = {
      ...session,
      cart,
      customer,
      discount,
      heldOrders,
      txnId,
    };

    useEffect(() => {
      let mounted = true;

      const loadData = async () => {
        try {
          setLoadingData(true);
          setDataError("");

          const storeId =
            Number(session.store.id);

          if (
            !Number.isInteger(storeId) ||
            storeId <= 0
          ) {
            throw new Error(
              "Invalid POS store."
            );
          }

          const response = await fetch(
            `${API_BASE}/pos/pos-data.php`,
            {
              method: "GET",
              headers: posAuthHeaders(),
              cache: "no-store",
            }
          );

          const data =
            await readJson<PosDataResponse>(
              response
            );

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
                "Failed to load POS data."
            );
          }

          if (!mounted) return;

          setProducts(
            (data.products ?? []).map(
              mapProduct
            )
          );

          setCustomers(
            (data.customers ?? []).map(
              mapCustomer
            )
          );

          setPaymentMethods(
            (data.payment_methods ?? [])
              .filter(
                (paymentMethod) =>
                  paymentMethod.enabled &&
                  paymentMethod.is_available &&
                  !paymentMethod.is_coming_soon
              )
              .sort(
                (a, b) =>
                  Number(a.sort_order) -
                  Number(b.sort_order)
              )
          );

          if (data.tax) {
            setTaxConfig({
              id: Number(data.tax.id),
              name:
                String(
                  data.tax.name ?? ""
                ).trim() || "Tax",
              code:
                String(
                  data.tax.code ?? ""
                ).trim() || "TAX",
              rate: Math.max(
                0,
                Number(
                  data.tax.rate || 0
                )
              ),
              inclusive:
                toBoolean(
                  data.tax.inclusive
                ),
              applies:
                String(
                  data.tax.applies ?? "sale"
                ),
            });
          } else {
            throw new Error(
              "Default tax (ID 1) is not configured."
            );
          }
        } catch (error) {
          console.error(
            "Load POS data error:",
            error
          );

          if (!mounted) return;

          setProducts([]);
          setCustomers([]);
          setPaymentMethods([]);
          setDataError(
            error instanceof Error
              ? error.message
              : "Unable to load POS data."
          );
        } finally {
          if (mounted) {
            setLoadingData(false);
          }
        }
      };

      loadData();

      return () => {
        mounted = false;
      };
    }, [session.store.id]);

    useEffect(() => {
      let mounted = true;

      const loadHolds = async () => {
        try {
          const response = await fetch(`${API_BASE}/pos/holds.php`, {
            headers: posAuthHeaders(),
            cache: "no-store",
          });
          const data = await readJson<{
            success: boolean;
            message?: string;
            holds?: Array<{
              id: number;
              hold_no: string;
              customer_id?: number | null;
              customer_name?: string;
              subtotal: number;
              discount?: Discount | null;
              notes?: string | null;
              held_at: string;
              items: Array<{
                id: number;
                name: string;
                sku: string;
                price: number;
                qty: number;
              }>;
            }>;
          }>(response);

          if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load held orders.");
          }

          if (!mounted) return;

          const mapped: HeldOrder[] = (data.holds ?? []).map((hold) => ({
            id: String(hold.id),
            label: hold.hold_no,
            cart: hold.items.map((item) => ({
              id: String(item.id),
              name: item.name,
              sku: item.sku,
              price: Number(item.price),
              category: "Uncategorized",
              stock: 999999,
              qty: Number(item.qty),
            })),
            customer:
              hold.customer_id !== null && hold.customer_id !== undefined
                ? customers.find((c) => Number(c.id) === Number(hold.customer_id)) ?? null
                : null,
            discount: hold.discount ?? null,
            subtotal: Number(hold.subtotal || 0),
            heldAt: new Date(hold.held_at),
          }));

          setHeldOrders(mapped);
        } catch (error) {
          console.warn("Load POS holds failed:", error);
        }
      };

      loadHolds();

      return () => {
        mounted = false;
      };
    }, [session.store.id, customers.length]);

    useEffect(() => {
      if (
        view !== "cart"
      ) {
        setShowMobileCart(false);
      }
    }, [view]);

    useEffect(() => {
      if (showMobileCart) {
        document.body.style.overflow =
          "hidden";
      } else {
        document.body.style.overflow =
          "";
      }

      return () => {
        document.body.style.overflow =
          "";
      };
    }, [showMobileCart]);

    const addToCart = (id: string) => {
      setActionError("");

      const product =
        products.find(
          (item) => item.id === id
        );

      if (!product) {
        setActionError(
          "Product is no longer available."
        );
        return;
      }

      setCart((previous) => {
        const existing =
          previous.find(
            (item) =>
              item.id === id
          );

        const currentQty =
          existing?.qty ?? 0;

        if (
          product.stock <=
          currentQty
        ) {
          setActionError(
            `${product.name} has only ${product.stock} available.`
          );
          return previous;
        }

        if (existing) {
          return previous.map(
            (item) =>
              item.id === id
                ? {
                    ...item,
                    qty:
                      item.qty + 1,
                  }
                : item
          );
        }

        return [
          ...previous,
          {
            ...product,
            qty: 1,
          },
        ];
      });
    };

    const removeFromCart = (
      id: string
    ) => {
      setActionError("");

      setCart((previous) => {
        const item =
          previous.find(
            (entry) =>
              entry.id === id
          );

        if (!item) return previous;

        if (item.qty <= 1) {
          return previous.filter(
            (entry) =>
              entry.id !== id
          );
        }

        return previous.map(
          (entry) =>
            entry.id === id
              ? {
                  ...entry,
                  qty:
                    entry.qty - 1,
                }
              : entry
        );
      });
    };

    const removeItem = (
      id: string
    ) => {
      setActionError("");
      setCart((previous) =>
        previous.filter(
          (item) =>
            item.id !== id
        )
      );
    };

    const setQty = (
      id: string,
      qty: number
    ) => {
      const product =
        products.find(
          (item) => item.id === id
        );

      if (!product) return;

      const safeQty = Math.max(
        1,
        Math.min(
          Math.floor(qty),
          product.stock
        )
      );

      setCart((previous) =>
        previous.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  qty: safeQty,
                }
              : item
        )
      );
    };

    const clearCart = () => {
      setActionError("");
      setCart([]);
      setDiscount(null);
      setCustomer(null);
    };


    const createHold = async (notes: string) => {
      if (cart.length === 0) {
        throw new Error("Cart is empty.");
      }

      const response = await fetch(`${API_BASE}/pos/holds.php`, {
        method: "POST",
        headers: posAuthHeaders(true),
        body: JSON.stringify({
          action: "create",
          items: cart.map((item) => ({
            product_id: Number(item.id),
            quantity: Number(item.qty),
            unit_price: Number(item.price),
          })),
          customer_id: customer?.id ? Number(customer.id) : null,
          discount,
          subtotal,
          notes,
        }),
      });

      const data = await readJson<{
        success: boolean;
        message?: string;
        hold_id?: number;
        hold_no?: string;
      }>(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to hold order.");
      }

      const held: HeldOrder = {
        id: String(data.hold_id),
        label: String(data.hold_no ?? data.hold_id),
        cart: [...cart],
        customer,
        discount,
        subtotal,
        heldAt: new Date(),
      };

      setHeldOrders((previous) => [held, ...previous]);
      setCart([]);
      setCustomer(null);
      setDiscount(null);
      setTxnId(generateTxnId());
      setShowHold(false);
      setShowMobileCart(false);
    };

    const resumeOrder = async (order: HeldOrder) => {
      let resumed = order;

      if (Number(order.id) > 0) {
        const response = await fetch(
          `${API_BASE}/pos/holds.php`,
          {
            method: "POST",
            headers: posAuthHeaders(true),
            body: JSON.stringify({
              action: "resume",
              hold_id: Number(order.id),
            }),
          }
        );

        const data = await readJson<{
          success: boolean;
          message?: string;
          hold?: {
            id: number;
            customer_id?: number | null;
            subtotal: number;
            discount?: Discount | null;
            notes?: string | null;
            held_at: string;
            items: Array<{
              product_id: number;
              quantity: number;
              unit_price: number;
            }>;
          };
        }>(response);

        if (!response.ok || !data.success || !data.hold) {
          throw new Error(data.message || "Unable to resume held order.");
        }

        const holdCustomer =
          data.hold.customer_id !== null &&
          data.hold.customer_id !== undefined
            ? customers.find(
                (item) => Number(item.id) === Number(data.hold?.customer_id)
              ) ?? null
            : null;

        resumed = {
          ...order,
          cart: data.hold.items.map((item) => {
            const product = products.find(
              (p) => Number(p.id) === Number(item.product_id)
            );
            return {
              ...(product ?? {
                id: String(item.product_id),
                name: `Product #${item.product_id}`,
                sku: "",
                category: "Uncategorized",
                stock: 999999,
                price: Number(item.unit_price),
              }),
              price: Number(item.unit_price),
              qty: Number(item.quantity),
            };
          }),
          customer: holdCustomer,
          discount: data.hold.discount ?? null,
          subtotal: Number(data.hold.subtotal || 0),
          heldAt: new Date(data.hold.held_at),
        };
      }

      setCart(resumed.cart);
      setCustomer(resumed.customer);
      setDiscount(resumed.discount);
      setHeldOrders((previous) =>
        previous.filter((held) => held.id !== resumed.id)
      );
      setTxnId(generateTxnId());
      setReceiptNo("");
      setView("cart");
    };

    const deleteHeld = async (id: string) => {
      const order = heldOrders.find((held) => held.id === id);

      if (!order) {
        return;
      }

      if (Number(order.id) > 0) {
        const response = await fetch(
          `${API_BASE}/pos/holds.php?id=${encodeURIComponent(String(order.id))}`,
          {
            method: "DELETE",
            headers: posAuthHeaders(),
          }
        );

        const data = await readJson<{ success: boolean; message?: string }>(
          response
        );

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to delete held order.");
        }
      }

      setHeldOrders((previous) =>
        previous.filter((held) => held.id !== id)
      );
    };

    const handleNewSale = () => {
      setCart([]);
      setCustomer(null);
      setDiscount(null);
      setPaid(0);
      setMethod(
      paymentMethods[0]?.code ?? ""
    );
      setReceiptNo("");
      setActionError("");
      setTxnId(
        generateTxnId()
      );
      setView("cart");
    };


    const completeSale = async (
      payments: PaymentPart[]
    ) => {
      setActionError("");

      if (cart.length === 0) {
        setActionError("Cart is empty.");
        return;
      }

      const normalizedPayments = payments
        .map((item) => ({
          method: String(item.method).trim().toLowerCase(),
          amount: Number(item.amount) || 0,
        }))
        .filter((item) => item.method && item.amount >= 0);

      const totalPaid = normalizedPayments.reduce(
        (sum, item) => sum + item.amount,
        0
      );

      const totals = calcTotals(cart, discount, taxConfig);

      if (normalizedPayments.length === 0) {
        throw new Error("Select a payment method.");
      }

      if (totalPaid + 0.01 < totals.total) {
        throw new Error(
          `Insufficient payment. Amount due: ₱${totals.total.toFixed(2)}.`
        );
      }

      if (
        normalizedPayments.length > 1 &&
        Math.abs(totalPaid - totals.total) > 0.01
      ) {
        throw new Error(
          `Split payments must total exactly ₱${totals.total.toFixed(2)}.`
        );
      }

      const response = await fetch(
        `${API_BASE}/pos/complete-sale.php`,
        {
          method: "POST",
          headers: posAuthHeaders(true),
          body: JSON.stringify({
            customer_id: customer?.id ? Number(customer.id) : null,
            items: cart.map((item) => ({
              product_id: Number(item.id),
              quantity: Number(item.qty),
            })),
            discount_code: discount?.code
              ? String(discount.code).trim()
              : null,
            payments: normalizedPayments,
            notes: null,
          }),
        }
      );

      const data =
        await readJson<CompleteSaleResponse>(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "The sale could not be completed."
        );
      }

      setPaid(totalPaid);
      setMethod(
        normalizedPayments.length > 1
          ? "split"
          : normalizedPayments[0].method
      );

      setReceiptNo(String(data.receipt_no ?? ""));

      try {
        const dataResponse = await fetch(
          `${API_BASE}/pos/pos-data.php`,
          {
            headers: posAuthHeaders(),
            cache: "no-store",
          }
        );

        const refreshed =
          await readJson<PosDataResponse>(
            dataResponse
          );

        if (dataResponse.ok && refreshed.success) {
          setProducts(
            (refreshed.products ?? []).map(
              mapProduct
            )
          );
        }
      } catch (refreshError) {
        console.warn(
          "Product stock refresh after sale failed:",
          refreshError
        );
      }

      setView("receipt");
    };

    const cartPanelProps = {
      txnId,
      cart,
      customer,
      discount,
      taxRate: taxConfig.rate,
      taxInclusive:
        taxConfig.inclusive,
      taxLabel:
        getTaxLabel(taxConfig),
      onAdd: addToCart,
      onRemove:
        removeFromCart,
      onSetQty: setQty,
      onRemoveItem:
        removeItem,
      onClear: clearCart,
      onCustomer: () =>
        setShowCustomer(true),
      onDiscount: () =>
        setShowDiscount(true),
      // Open hold modal; the modal saves the cart + notes to the database.
      onHold: () => setShowHold(true),
      onCheckout: () =>
        setView("payment"),
    };

    return (
      <div className="min-h-full flex flex-col">
        <POSHeader
          session={liveSession}
          onLock={onLock}
          onLogout={onLogout}
          onHold={() =>
            setShowHold(true)
          }
          onShowCustomer={() =>
            setShowCustomer(true)
          }
          onTransactions={() =>
            setShowTransactions(true)
          }
          onRefundApprovals={() =>
            setShowRefundApprovals(true)
          }
        />

        {dataError && (
          <div className="px-3 sm:px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 flex items-center justify-between gap-3">
            <span>
              {dataError}
            </span>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="font-semibold underline flex-shrink-0"
            >
              Reload
            </button>
          </div>
        )}

        {actionError && (
          <div className="px-3 sm:px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
            {actionError}
          </div>
        )}

        <div className="flex-1 flex overflow-hidden relative">
          {view === "cart" && (
            <>
              <ProductGrid
                products={products}
                cart={cart}
                onAdd={addToCart}
                onRemove={
                  removeFromCart
                }
                onSetQty={
                  setQty
                }
              />

              <div className="hidden md:flex md:w-[300px] lg:w-[320px] flex-shrink-0 border-l border-slate-200 overflow-hidden">
                <CartPanel
                  {...cartPanelProps}
                />
              </div>

              <FloatingCartBar
                cart={cart}
                discount={discount}
                heldOrders={
                  heldOrders
                }
                onOpen={() =>
                  setShowMobileCart(
                    true
                  )
                }
              />

              {loadingData &&
                products.length === 0 && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="bg-white/90 rounded-2xl border border-slate-200 shadow-lg px-5 py-4 text-center">
                      <div className="w-6 h-6 mx-auto border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs font-medium text-slate-600 mt-2">
                        Loading POS data…
                      </p>
                    </div>
                  </div>
                )}
            </>
          )}

          {view === "payment" && (
            <PaymentView
              cart={cart}
              customer={customer}
              discount={discount}
              taxConfig={
                taxConfig
              }
              paymentMethods={
                paymentMethods
              }
              onBack={() =>
                setView("cart")
              }
              onComplete={
                completeSale
              }
            />
          )}

          {view === "receipt" && (
            <ReceiptView
              session={
                liveSession
              }
              cart={cart}
              customer={
                customer
              }
              discount={
                discount
              }
              taxConfig={
                taxConfig
              }
              paid={paid}
              method={method}
              txnId={txnId}
              receiptNo={
                receiptNo
              }
              onNewSale={
                handleNewSale
              }
            />
          )}
        </div>

        {showMobileCart && (
          <div className="md:hidden fixed inset-0 z-30 flex flex-col">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() =>
                setShowMobileCart(
                  false
                )
              }
            />

            <div
              className="relative mt-auto w-full bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
              style={{
                maxHeight:
                  "90dvh",
                animation:
                  "slideUp 0.25s ease-out",
              }}
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              <CartPanel
                {...cartPanelProps}
                onClose={() =>
                  setShowMobileCart(
                    false
                  )
                }
              />
            </div>
          </div>
        )}

        {showCustomer && (
          <CustomerModal
            customers={
              customers
            }
            current={
              customer
            }
            loading={
              loadingData
            }
            onSelect={
              setCustomer
            }
            onClose={() =>
              setShowCustomer(
                false
              )
            }
          />
        )}

        {showDiscount && (
          <DiscountModal
            current={
              discount
            }
            subtotal={
              subtotal
            }
            storeId={Number(session.store.id)}
            onApply={
              setDiscount
            }
            onClose={() =>
              setShowDiscount(
                false
              )
            }
          />
        )}

        {showHold && (
          <HoldModal
            heldOrders={
              heldOrders
            }
            currentCart={cart}
            currentCustomer={customer}
            currentDiscount={discount}
            onCreateHold={createHold}
            onResume={resumeOrder}
            onDelete={deleteHeld}
            onClose={() =>
              setShowHold(
                false
              )
            }
          />
        )}

        {showTransactions && (
          <TransactionHistoryModal
            onClose={() => setShowTransactions(false)}
          />
        )}

        {showRefundApprovals && (
          <RefundApprovalModal
              currentUser={session.user}
              onClose={() => setShowRefundApprovals(false)}
            />
        )}

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }
