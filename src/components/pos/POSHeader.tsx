import { useState, useEffect } from "react";
import type { POSSession } from "@/types/pos";

interface Props {
  session: POSSession;
  onLock: () => void;
  onLogout: () => void;
  onHold: () => void;
  onShowCustomer: () => void;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function useClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(
      () => setNow(new Date()),
      1000
    );

    return () => clearInterval(timer);
  }, []);

  return now;
}

export default function POSHeader({
  session,
  onLock,
  onLogout,
  onHold,
  onShowCustomer,
}: Props) {
  const now = useClock();

  const timeStr = now.toLocaleTimeString(
    "en-PH",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );

  const [menuOpen, setMenuOpen] =
    useState(false);

  /*
   * Hold count is derived directly from the POS session.
   * No extra prop is required.
   */
  const heldCount =
    Array.isArray(session.heldOrders)
      ? session.heldOrders.length
      : 0;

  return (
    <header className="h-14 bg-[#1a1d2e] flex items-center justify-between px-3 sm:px-4 flex-shrink-0 select-none relative z-30">
      {/* Left: Store Branding */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img
            src="/logo2.png"
            alt="Rhea POS"
            className="w-full h-full object-contain p-1"
          />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-tight truncate">
            {session.store.name}
          </p>

          <p className="text-[10px] text-slate-400 leading-tight truncate">
            {session.store.branch}
            {" · "}
            {session.store.terminal}
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Cashier + time — desktop only */}
        <div className="hidden md:flex items-center gap-2 mr-1">
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {initials(session.user.name)}
          </div>

          <div>
            <p className="text-xs font-semibold text-white leading-tight">
              {session.user.name}
            </p>
          </div>

          <p className="text-xs text-slate-400">
            {timeStr}
          </p>
        </div>

        <div className="hidden md:block w-px h-5 bg-slate-700" />

        {/* Customer */}
        <button
          type="button"
          onClick={onShowCustomer}
          className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-600 text-xs font-medium text-slate-300 hover:border-slate-400 hover:text-white transition"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle
              cx="12"
              cy="8"
              r="4"
            />
            <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
          </svg>

          {session.customer
            ? session.customer.name.split(" ")[0]
            : "Guest"}
        </button>

        {/* Hold */}
        <button
          type="button"
          onClick={onHold}
          className={`hidden md:flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition ${
            heldCount > 0
              ? "border-amber-400/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400"
              : "border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
          }`}
          title={
            heldCount > 0
              ? `${heldCount} held order${
                  heldCount === 1 ? "" : "s"
                } waiting`
              : "View held orders"
          }
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect
              x="6"
              y="4"
              width="4"
              height="16"
              rx="1"
            />
            <rect
              x="14"
              y="4"
              width="4"
              height="16"
              rx="1"
            />
          </svg>

          Hold

          {heldCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
              {heldCount}
            </span>
          )}
        </button>

        {/* Lock */}
        <button
          type="button"
          onClick={onLock}
          title="Lock terminal"
          className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-400 transition"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect
              x="5"
              y="11"
              width="14"
              height="10"
              rx="2"
            />
            <path d="M8 11V7a4 4 0 1 1 8 0v4" />
          </svg>
        </button>

        {/* Mobile menu */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() =>
              setMenuOpen((value) => !value)
            }
            className="w-9 h-9 rounded-lg border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-400 transition"
            aria-label="Open POS menu"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line
                x1="3"
                y1="6"
                x2="21"
                y2="6"
              />
              <line
                x1="3"
                y1="12"
                x2="21"
                y2="12"
              />
              <line
                x1="3"
                y1="18"
                x2="21"
                y2="18"
              />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() =>
                  setMenuOpen(false)
                }
              />

              <div className="absolute right-0 top-full mt-2 w-52 bg-[#1a1d2e] border border-slate-700 rounded-2xl overflow-hidden shadow-xl z-50">
                {/* Cashier */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                    {initials(session.user.name)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {session.user.name}
                    </p>

                    <p className="text-[10px] text-slate-400 capitalize">
                      {session.user.role} · {timeStr}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onShowCustomer();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition text-left"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <circle
                      cx="12"
                      cy="8"
                      r="4"
                    />
                    <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
                  </svg>

                  {session.customer
                    ? session.customer.name
                    : "Select Customer"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onHold();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 transition text-left"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <rect
                      x="6"
                      y="4"
                      width="4"
                      height="16"
                      rx="1"
                    />
                    <rect
                      x="14"
                      y="4"
                      width="4"
                      height="16"
                      rx="1"
                    />
                  </svg>

                  Held Orders

                  {heldCount > 0 && (
                    <span className="ml-auto w-5 h-5 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {heldCount}
                    </span>
                  )}
                </button>

                <div className="border-t border-slate-700" />

                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition text-left"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="M16 17l5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>

                  Logout
                </button>
              </div>
            </>
          )}
        </div>

        {/* Logout — desktop */}
        <button
          type="button"
          onClick={onLogout}
          title="Logout"
          className="hidden md:flex w-8 h-8 rounded-lg border border-slate-600 items-center justify-center text-slate-400 hover:text-red-400 hover:border-red-400/50 transition"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
