import { useEffect, useState } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export default function Modal({ title, onClose, children, width = "max-w-md" }: ModalProps) {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateViewportHeight = () => {
      setViewportHeight(viewport?.height ?? window.innerHeight);
    };

    updateViewportHeight();
    viewport?.addEventListener("resize", updateViewportHeight);
    window.addEventListener("resize", updateViewportHeight);

    return () => {
      viewport?.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("resize", updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    // Prevent body scroll while modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-hidden p-0 sm:p-4"
      style={{ paddingBottom: viewportHeight ? Math.max(0, window.innerHeight - viewportHeight) : undefined }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, centered on sm+ */}
      <div
        className={`
          relative w-full ${width} bg-white flex flex-col overflow-hidden
          rounded-t-2xl sm:rounded-2xl
          shadow-2xl shadow-slate-900/20
          max-h-[92dvh] sm:max-h-[85vh] min-h-0
          animate-[slideUp_0.22s_ease-out]
        `}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ maxHeight: viewportHeight ? `${Math.max(240, viewportHeight - 70)}px` : undefined }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
