import { useState } from "react";
import type { Store, User } from "@/types/pos";

interface Props {
  store: Store;
  onSuccess: (u: User) => void;
  onBack: () => void;
}

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

type ApiLoginUser = {
  id: number | string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  full_name?: string | null;
  role?: string | null;
  status?: string | null;
};

type LoginResponse = {
  success: boolean;
  message?: string;
  user?: ApiLoginUser;
};

function getStoreId(store: Store): number {
  return Number((store as Store & { id: unknown }).id);
}

function getStoreName(store: Store): string {
  const value = (store as Store & { name?: unknown }).name;
  return String(value ?? "").trim() || "Store";
}

function getBranchName(store: Store): string {
  const value = (store as Store & { branch?: unknown }).branch;
  return String(value ?? "").trim() || "Branch";
}

function getTerminal(store: Store): string {
  const value = (store as Store & { terminal?: unknown }).terminal;
  return String(value ?? "").trim() || `Store #${getStoreId(store)}`;
}

function buildUserForPos(
  loginUser: ApiLoginUser,
  storeId: number
): User {
  const username = String(loginUser.username ?? "");

  const email = String(loginUser.email ?? "");

  const fullName = String(
    loginUser.full_name ??
      loginUser.username ??
      "Cashier"
  );

  const roleValue = String(
    loginUser.role ?? ""
  ).toLowerCase();

  const role = (
    roleValue === "manager"
      ? "manager"
      : roleValue === "admin"
      ? "admin"
      : "cashier"
  ) as User["role"];

  const status = String(
    loginUser.status ?? "active"
  ).toLowerCase();

  // Do NOT spread the API objects into User.
  // Their nullable fields (especially phone) do not match the POS User type.
  return {
    id: String(loginUser.id),
    username,
    name: fullName,
    full_name: fullName,
    email,
    phone:
      loginUser.phone != null
        ? String(loginUser.phone)
        : undefined,
    role,
    store_id: String(storeId),
    pin_hash: "",
    active: status === "active",
    pos_access: roleValue === "cashier",
  };
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      text.trim().startsWith("<")
        ? "The server returned HTML instead of JSON. Please check the PHP API."
        : `The server returned an invalid response: ${text.substring(
            0,
            250
          )}`
    );
  }
}

export default function LoginScreen({
  store,
  onSuccess,
  onBack,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const loginValue = email.trim();

    if (!loginValue || !password) {
      setError("Please enter your email or username and password.");
      return;
    }

    const selectedStoreId = getStoreId(store);

    if (!Number.isInteger(selectedStoreId) || selectedStoreId <= 0) {
      setError("The selected store is invalid. Please go back and select a valid store.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * ------------------------------------------------------------
       * 1. AUTHENTICATE AGAINST THE REAL USERS TABLE
       * ------------------------------------------------------------
       *
       * This uses the same backend login endpoint already used by
       * the Admin Login screen.
       */
      const loginResponse = await fetch(
        `${API_BASE}/auth/login.php`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            login: loginValue,
            password,
            store_id: selectedStoreId,
          }),
        }
      );

      const loginData =
        await readJsonResponse<LoginResponse>(
          loginResponse
        );

      if (!loginResponse.ok || !loginData.success || !loginData.user) {
        setError(
          loginData.message ||
            "Invalid credentials. Please try again."
        );
        return;
      }

      const loggedInUser = loginData.user;

      /*
       * ------------------------------------------------------------
       * 2. ACCOUNT / STORE AUTHORIZATION
       * ------------------------------------------------------------
       *
       * The backend already verifies:
       *   - users.status = active
       *   - users.role = cashier
       *   - user_stores.user_id = logged-in user
       *   - user_stores.store_id = selected store
       *   - stores.status = active
       *
       * No second users/list.php request is needed here.
       */

      /*
       * ------------------------------------------------------------
       * 3. BUILD POS USER
       * ------------------------------------------------------------
       */
      const posUser = buildUserForPos(
        loggedInUser,
        selectedStoreId
      );

      console.log("POS login successful:", {
        userId: posUser.id,
        cashier: posUser.full_name,
        role: posUser.role,
        storeId: selectedStoreId,
      });

      /*
       * No mock password, mock users, or artificial delay.
       * The real PHP authentication is the source of truth.
       */
      onSuccess(posUser);
    } catch (err) {
      console.error("POS login error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const storeName = getStoreName(store);
  const branchName = getBranchName(store);
  const terminal = getTerminal(store);

  return (
    <div className="min-h-full relative overflow-hidden bg-slate-950 flex items-center justify-center px-4 py-6 sm:px-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_42%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[430px]">
        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white disabled:opacity-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </span>
          Back to store selection
        </button>

        {/* Main login card */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/30">
          {/* Brand header */}
          <div className="relative bg-[#1a1d2e] px-6 pb-7 pt-8 text-center sm:px-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />

            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white shadow-xl shadow-black/20">
              <img
                src="/logo2.png"
                alt="Rhea POS"
                className="h-full w-full object-contain p-2"
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Rhea POS
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Point of Sale System
            </p>

            {/* Store information */}
            <div className="mx-auto mt-5 flex max-w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l1.5-6h15L21 9" />
                  <path d="M3 9h18" />
                  <path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9" />
                  <rect x="9" y="13" width="6" height="8" rx="1" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {storeName}
                </p>
                <p className="truncate text-[10px] text-slate-400">
                  {branchName} · {terminal}
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-7 sm:px-8 sm:py-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Sign in to continue to your POS terminal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email / username */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Email or Username
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" />
                    </svg>
                  </div>

                  <input
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                    placeholder="Enter email or username"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Password
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
                    </svg>
                  </div>

                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    disabled={loading}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPw((value) => !value)}
                    disabled={loading}
                    tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                  >
                    {showPw ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-snug text-red-700"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    className="mt-0.5 flex-shrink-0 text-red-500"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 hover:shadow-indigo-600/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
                      />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In to POS
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Secure POS terminal
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="text-xs font-medium text-slate-500 transition hover:text-white disabled:opacity-50"
          >
            Switch Store
          </button>

          <p className="mt-3 text-[10px] text-slate-600">
            Rhea POS v2.4 · {terminal}
          </p>
        </div>
      </div>
    </div>
  );
}
