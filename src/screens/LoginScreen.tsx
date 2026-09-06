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
    <div className="min-h-full bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 mb-5 sm:mb-6 transition touch-manipulation disabled:opacity-50"
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
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to store selection
        </button>

        {/* Brand */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 mb-3 sm:mb-4">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Rhea POS
          </h1>

          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1 max-w-full overflow-hidden">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-indigo-500 flex-shrink-0"
            >
              <path d="M3 9l1.5-6h15L21 9M3 9h18M3 9v11a1 1 0 0 0 1-1 1h16a1 1 0 0 0 1-1V9" />
              <rect x="9" y="13" width="6" height="7" rx="1" />
            </svg>

            <span className="font-medium truncate">
              {storeName} · {branchName}
            </span>

            <span className="text-slate-300 flex-shrink-0">
              ·
            </span>

            <span className="font-mono text-slate-400 flex-shrink-0">
              {terminal}
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="mb-5 sm:mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Cashier Sign In
            </h2>

            <p className="text-sm text-slate-400 mt-0.5">
              Enter your credentials to access this terminal.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">
                Email Address
              </label>

              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                disabled={loading}
                placeholder="cashier@rheapos.com"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">
                Password
              </label>

              <div className="relative">
                <input
                  type={
                    showPw
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPw((value) => !value)
                  }
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1 touch-manipulation disabled:opacity-50"
                  tabIndex={-1}
                  aria-label={
                    showPw
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPw ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line
                        x1="2"
                        y1="2"
                        x2="22"
                        y2="22"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 leading-snug">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="mt-0.5 flex-shrink-0 text-red-500"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />
                  <line
                    x1="12"
                    y1="8"
                    x2="12"
                    y2="12"
                  />
                  <circle
                    cx="12"
                    cy="16"
                    r="1"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>

                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !email.trim() ||
                !password
              }
              className="w-full h-12 rounded-xl bg-indigo-600 text-white text-sm font-semibold tracking-wide hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 shadow-sm shadow-indigo-200 touch-manipulation"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="white"
                      d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
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
                  Sign In to POS
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-indigo-600 transition touch-manipulation disabled:opacity-50"
          >
            Switch Store
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-slate-300">
          Secured connection · Rhea POS v2.4 · {terminal}
        </p>
      </div>
    </div>
  );
}
