import { useEffect, useState } from "react";
import type { Store } from "@/types/pos";

type Props = {
  stores: Store[];
  loading: boolean;
  onSelect: (
    store: Store,
    pin: string
  ) => Promise<{ success: boolean; message?: string }>;
  onBack: () => void;
};

function getStoreName(store: Store): string {
  return String((store as Store & { name?: unknown }).name ?? "Store").trim() || "Store";
}

function getBranchName(store: Store): string {
  return String((store as Store & { branch?: unknown }).branch ?? "Branch").trim() || "Branch";
}

export default function StoreSelectScreen({
  stores,
  loading,
  onSelect,
  onBack,
}: Props) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState("");

  const closePinModal = () => {
    if (loading) return;
    setSelectedStore(null);
    setPin("");
    setShowPin(false);
    setPinError("");
  };

  const openStore = (store: Store) => {
    if (loading) return;
    setSelectedStore(store);
    setPin("");
    setShowPin(false);
    setPinError("");
  };

  const submitPin = async () => {
    if (!selectedStore || loading) return;

    const cleanPin = pin.trim();
    if (!cleanPin) {
      setPinError("Please enter your POS PIN.");
      return;
    }

    setPinError("");

    try {
      const result = await onSelect(selectedStore, cleanPin);

      if (!result.success) {
        setPinError(result.message || "Invalid POS PIN.");
      }
    } catch (error) {
      setPinError(
        error instanceof Error
          ? error.message
          : "Unable to verify your POS PIN."
      );
    }
  };

  useEffect(() => {
    if (!selectedStore || loading) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePinModal();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedStore, loading]);

  return (
    <div className="min-h-full min-h-screen bg-slate-100 flex flex-col">
      <header className="h-16 sm:h-20 bg-white border-b border-slate-200 flex items-center px-5 sm:px-8">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo2.png"
              alt="Rhea POS"
              className="h-10 sm:h-12 w-auto object-contain"
            />
            <div className="hidden sm:block border-l border-slate-200 pl-3">
              <p className="text-sm font-semibold text-slate-900">R&J POS</p>
              <p className="text-[11px] text-slate-400">Retail Point of Sale</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium text-slate-500">System Online</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-3xl">
          <div className="mb-5 flex justify-start">
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50"
            >
              <span>←</span>
              Back to login
            </button>
          </div>

          <div className="text-center mb-7 sm:mb-9">
            <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 mr-1.5">
                <path d="M3 9l1.5-6h15L21 9" />
                <path d="M3 9h18" />
                <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
              </svg>
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Store Selection</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Choose your store</h1>
            <p className="mt-2 text-sm text-slate-500">Only stores assigned to your user account are shown.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Assigned Stores</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {loading ? "Opening selected store..." : `${stores.length} active ${stores.length === 1 ? "location" : "locations"}`}
                </p>
              </div>
              {!loading && stores.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-semibold text-emerald-700">ACTIVE</span>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4">
              {stores.length === 0 ? (
                <div className="py-12 px-5 text-center">
                  <h3 className="text-sm font-semibold text-slate-800">No active stores found</h3>
                  <p className="mt-1 max-w-sm mx-auto text-xs leading-5 text-slate-400">Your account is not currently assigned to an active store.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stores.map((store) => (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => openStore(store)}
                      disabled={loading}
                      className="group w-full text-left rounded-xl border border-slate-200 bg-white px-4 py-4 transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-sm active:scale-[0.995] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-indigo-600 transition-colors">
                            <path d="M3 9l1.5-6h15L21 9" />
                            <path d="M3 9h18" />
                            <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
                            <path d="M9 21v-6h6v6" />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">{getStoreName(store)}</p>
                            <span className="hidden sm:inline text-slate-300">/</span>
                            <p className="text-xs font-medium text-indigo-600 truncate">{getBranchName(store)}</p>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5 truncate">{store.address || "Address not available"}</p>
                        </div>

                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 group-hover:bg-indigo-600 transition-colors">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-white transition-colors">
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span>🔒 Secure POS Environment</span>
            <span className="text-slate-300">•</span>
            <span>R&J POS v0.01</span>
          </div>
        </div>
      </main>

      {selectedStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closePinModal();
        }}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">Enter Store PIN</p>
                <p className="mt-0.5 text-xs text-slate-400">{getStoreName(selectedStore)} — {getBranchName(selectedStore)}</p>
              </div>
              <button type="button" onClick={closePinModal} disabled={loading} className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="p-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">POS PIN</label>
              <div className="relative">
                <input
                  autoFocus
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\s/g, ""))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      submitPin();
                    }
                  }}
                  disabled={loading}
                  placeholder="Enter your PIN"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowPin((value) => !value)} disabled={loading} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
                  {showPin ? "Hide" : "Show"}
                </button>
              </div>

              <p className="mt-2 text-[11px] text-slate-400">Enter the PIN assigned to your POS account to open this branch.</p>

              {pinError && (
                <div
                  className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5"
                  role="alert"
                >
                  <p className="text-xs font-semibold text-red-700">{pinError}</p>
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button type="button" onClick={closePinModal} disabled={loading} className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" onClick={submitPin} disabled={loading || !pin.trim()} className="h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                  {loading ? "Opening…" : "Continue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
