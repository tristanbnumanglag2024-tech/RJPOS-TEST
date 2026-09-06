import { useEffect, useState } from "react";
import type { Store } from "@/types/pos";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

type ApiStore = {
  id: number;
  store_name?: string | null;
  branch_name?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  status?: string | null;
};

export default function StoreSelectScreen({
  onSelect,
}: {
  onSelect: (s: Store) => void;
}) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadStores = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_BASE}/stores/list.php`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const text = await response.text();

        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            `Store API did not return valid JSON: ${text.substring(0, 300)}`
          );
        }

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || `Failed to load stores. Server returned ${response.status}.`
          );
        }

        const rows: ApiStore[] = Array.isArray(data.stores)
          ? data.stores
          : [];

        const activeStores: Store[] = rows
          .filter(
            (store) =>
              Number.isInteger(Number(store.id)) &&
              Number(store.id) > 0 &&
              String(store.status || "active").toLowerCase() !== "inactive"
          )
          .map((store) => {
            const storeName =
              String(store.store_name || "").trim() ||
              `Store #${store.id}`;

            const branchName =
              String(store.branch_name || "").trim() ||
              storeName;

            const addressParts = [
              store.address,
              store.city,
              store.province,
            ]
              .map((value) => String(value || "").trim())
              .filter(Boolean);

            const address = addressParts.join(", ");

            return {
              id: String(store.id),
              name: storeName,
              branch: branchName,
              address: address || "Address not available",
              terminal: `Store #${Number(store.id)}`,
            } as Store;
          });

        if (mounted) {
          setStores(activeStores);
        }
      } catch (err) {
        console.error("Load POS stores error:", err);

        if (mounted) {
          setStores([]);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load stores."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStores();

    return () => {
      mounted = false;
    };
  }, []);

 return (
  <div className="min-h-full min-h-screen bg-slate-100 flex flex-col">
    {/* Top Brand Bar */}
    <header className="h-16 sm:h-20 bg-white border-b border-slate-200 flex items-center px-5 sm:px-8">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo2.png"
            alt="Rhea POS"
            className="h-10 sm:h-12 w-auto object-contain"
          />

          <div className="hidden sm:block border-l border-slate-200 pl-3">
            <p className="text-sm font-semibold text-slate-900">
              R&J POS
            </p>
            <p className="text-[11px] text-slate-400">
              Retail Point of Sale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>

          <span className="text-xs font-medium text-slate-500">
            System Online
          </span>
        </div>
      </div>
    </header>

    {/* Main */}
    <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-3xl">
        {/* Heading */}
        <div className="text-center mb-7 sm:mb-9">
          <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-4">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-indigo-600 mr-1.5"
            >
              <path d="M3 9l1.5-6h15L21 9" />
              <path d="M3 9h18" />
              <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
            </svg>

            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">
              Terminal Setup
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Select your store
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Choose the branch you want to open this POS terminal for.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-600"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  Unable to load stores
                </p>

                <p className="text-xs text-red-600 mt-1 break-words">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 inline-flex items-center text-xs font-semibold text-red-700 hover:text-red-800"
                >
                  Try again
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-1"
                  >
                    <path d="M4 4v6h6" />
                    <path d="M20 20v-6h-6" />
                    <path d="M5.5 9A7 7 0 0 1 17 6.5L20 9" />
                    <path d="M18.5 15A7 7 0 0 1 7 17.5L4 15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Store Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Available Stores
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                {loading
                  ? "Checking available locations..."
                  : `${stores.length} active ${
                      stores.length === 1 ? "location" : "locations"
                    }`}
              </p>
            </div>

            {!loading && stores.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-700">
                  ACTIVE
                </span>
              </div>
            )}
          </div>

          {/* Store List */}
          <div className="p-3 sm:p-4">
            {loading ? (
              <div className="py-12 text-center">
                <div className="relative w-10 h-10 mx-auto">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-100" />

                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 animate-spin" />
                </div>

                <p className="text-sm font-medium text-slate-700 mt-4">
                  Loading stores
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Please wait while we retrieve your store locations.
                </p>
              </div>
            ) : stores.length === 0 ? (
              <div className="py-12 px-5 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-400"
                  >
                    <path d="M3 9l1.5-6h15L21 9" />
                    <path d="M3 9h18" />
                    <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-800">
                  No active stores found
                </h3>

                <p className="mt-1 max-w-sm mx-auto text-xs leading-5 text-slate-400">
                  There are currently no active stores available for this POS
                  terminal.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stores.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelect(s)}
                    className="
                      group
                      w-full
                      text-left
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      py-4
                      transition-all
                      duration-200
                      hover:border-indigo-300
                      hover:bg-indigo-50/30
                      hover:shadow-sm
                      active:scale-[0.995]
                      focus:outline-none
                      focus:ring-2
                      focus:ring-indigo-500/20
                    "
                  >
                    <div className="flex items-center gap-4">
                      {/* Store Icon */}
                      <div
                        className="
                          w-11
                          h-11
                          rounded-xl
                          bg-slate-100
                          group-hover:bg-indigo-100
                          flex
                          items-center
                          justify-center
                          flex-shrink-0
                          transition-colors
                        "
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-slate-500 group-hover:text-indigo-600 transition-colors"
                        >
                          <path d="M3 9l1.5-6h15L21 9" />
                          <path d="M3 9h18" />
                          <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
                          <path d="M9 21v-6h6v6" />
                        </svg>
                      </div>

                      {/* Store Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {s.name}
                          </p>

                          <span className="hidden sm:inline text-slate-300">
                            /
                          </span>

                          <p className="text-xs font-medium text-indigo-600 truncate">
                            {s.branch}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-slate-400 flex-shrink-0"
                          >
                            <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
                            <circle cx="12" cy="9" r="2.2" />
                          </svg>

                          <p className="text-xs text-slate-400 truncate">
                            {s.address || "Address not available"}
                          </p>
                        </div>
                      </div>

                      {/* Terminal + Arrow */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="hidden sm:block text-right">
                          <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                            Terminal
                          </p>

                          <p className="text-[10px] font-mono font-medium text-slate-600 mt-0.5">
                            {s.terminal}
                          </p>
                        </div>

                        <div
                          className="
                            w-8
                            h-8
                            rounded-lg
                            flex
                            items-center
                            justify-center
                            bg-slate-50
                            group-hover:bg-indigo-600
                            transition-colors
                          "
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-slate-400 group-hover:text-white transition-colors"
                          >
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Security / Footer */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 5 6v5c0 4.7 3 8.8 7 10 4-1.2 7-5.3 7-10V6l-7-3Z" />
            <path d="m9.5 12 1.7 1.7 3.5-3.5" />
          </svg>

          <span>Secure POS Environment</span>

          <span className="text-slate-300">•</span>

          <span>R&J POS v0.01</span>
        </div>
      </div>
    </main>
  </div>
);
}