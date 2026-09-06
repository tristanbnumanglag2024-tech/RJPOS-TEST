import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { Customer } from "@/types/pos";

interface Props {
  customers: Customer[];
  current: Customer | null;
  loading?: boolean;
  onSelect: (customer: Customer | null) => void;
  onClose: () => void;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-600",
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-600",
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-600",
];

export default function CustomerModal({
  customers,
  current,
  loading = false,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(q) ||
        customer.phone.toLowerCase().includes(q) ||
        customer.email.toLowerCase().includes(q)
    );
  }, [customers, query]);

  return (
    <Modal
      title="Select Customer"
      onClose={onClose}
      width="max-w-[420px]"
    >
      <div className="px-5 pt-4 pb-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, phone, email…"
            autoFocus
            className="w-full h-11 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          />
        </div>
      </div>

      <div className="overflow-y-auto max-h-[40vh] sm:max-h-72 divide-y divide-slate-50 px-2 pb-2">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Loading customers…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No customers found for this store.
          </div>
        ) : (
          filtered.map((customer, index) => {
            const colorClass =
              AVATAR_COLORS[index % AVATAR_COLORS.length];
            const isActive = current?.id === customer.id;

            return (
              <button
                type="button"
                key={customer.id}
                onClick={() => {
                  onSelect(customer);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-4 sm:py-3.5 rounded-xl text-left transition hover:bg-slate-50 active:bg-slate-100 ${
                  isActive ? "bg-indigo-50" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colorClass}`}
                >
                  {initials(customer.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold leading-tight ${
                      isActive
                        ? "text-indigo-700"
                        : "text-slate-800"
                    }`}
                  >
                    {customer.name}
                  </p>

                  <p className="text-xs text-slate-400 mt-0.5">
                    {customer.phone || customer.email || "No contact"}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-sm font-semibold text-amber-500">
                    {customer.points.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    pts
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          Continue as Guest
        </button>
      </div>
    </Modal>
  );
}
