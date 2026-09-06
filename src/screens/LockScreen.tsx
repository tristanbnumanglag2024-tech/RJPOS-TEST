import { useState, useEffect } from "react";
import type { POSSession } from "@/types/pos";

interface Props {
  session: POSSession;
  onUnlock: () => void;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

export default function LockScreen({ session, onUnlock }: Props) {
  const [pin, setPin]             = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError]         = useState("");
  const [unlocked, setUnlocked]   = useState(false);
  const [shake, setShake]         = useState(false);
  const now = useClock();

  const time = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
  const date = now.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 600); };

  const verifyPin = async (p: string) => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 700));
    if (p === session.user.pin_hash) {
      setUnlocked(true);
      await new Promise((r) => setTimeout(r, 500));
      onUnlock();
    } else {
      setError("Incorrect PIN. Try again.");
      setPin(""); setVerifying(false); triggerShake();
    }
  };

  const handleDigit = (d: string) => {
    if (pin.length >= 4 || verifying || unlocked) return;
    const next = pin + d;
    setPin(next); setError("");
    if (next.length === 4) verifyPin(next);
  };

  const keys = ["1","2","3","4","5","6","7","8","9","C","0","⌫"];

  return (
    <div className="min-h-full bg-slate-900 flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden select-none">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600 rounded-full blur-[120px] opacity-[0.08] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6 sm:gap-8 w-full max-w-xs sm:max-w-sm">
        {/* Clock */}
        <div className="text-center space-y-1">
          <div className="text-[58px] sm:text-[72px] font-thin text-white leading-none tracking-tight tabular-nums">{time}</div>
          <p className="text-slate-400 text-sm font-medium">{date}</p>
          <p className="text-xs text-slate-600 mt-1">{session.store.name} · {session.store.branch}</p>
        </div>

        {/* PIN card */}
        <div
          className="w-full bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col items-center gap-5 sm:gap-6"
          style={shake ? { animation: "shake 0.5s ease-in-out" } : {}}
        >
          {/* Lock icon */}
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${unlocked ? "bg-emerald-500 border-emerald-400 scale-110" : "bg-white/10 border-white/20"}`}>
            {unlocked
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-slate-400"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/></svg>
            }
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-slate-200">Register Locked</p>
            <p className="text-xs text-slate-500 mt-1">{session.user.name} · <span className="capitalize">{session.user.role}</span></p>
          </div>

          {/* PIN dots */}
          <div className="flex items-center gap-4 sm:gap-5">
            {[0,1,2,3].map((i) => (
              <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? error ? "bg-red-400 scale-125" : unlocked ? "bg-emerald-400 scale-125" : "bg-indigo-400 scale-125"
                  : "bg-white/20"
              }`} />
            ))}
          </div>

          {error && <p className="text-xs text-red-400 -mt-2">{error}</p>}
          {verifying && !unlocked && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 -mt-2">
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"/></svg>
              Verifying PIN…
            </div>
          )}

          {/* Keypad — larger touch targets on mobile */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {keys.map((k, i) => {
              const isClear = k === "C";
              const isBack = k === "⌫";
              const disabled = verifying || unlocked
                || (isBack && pin.length === 0)
                || (isClear && pin.length === 0)
                || (!isClear && !isBack && pin.length >= 4);

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (isClear) { setPin(""); setError(""); }
                    else if (isBack) { setPin((p) => p.slice(0, -1)); setError(""); }
                    else handleDigit(k);
                  }}
                  disabled={disabled}
                  className={`h-14 sm:h-14 rounded-xl text-base font-medium transition-all duration-100 active:scale-90 disabled:opacity-30 touch-manipulation ${
                    isClear ? "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 text-xs font-semibold" :
                    isBack  ? "bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 flex items-center justify-center" :
                    "bg-white/10 hover:bg-indigo-600 active:bg-indigo-700 border border-white/10 hover:border-indigo-500 text-white text-xl"
                  }`}
                >
                  {isBack
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                    : k}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-slate-700">Enter your 4-digit PIN to unlock this terminal</p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-6px)}
          30%{transform:translateX(6px)}
          45%{transform:translateX(-5px)}
          60%{transform:translateX(5px)}
          75%{transform:translateX(-3px)}
          90%{transform:translateX(3px)}
        }
      `}</style>
    </div>
  );
}
