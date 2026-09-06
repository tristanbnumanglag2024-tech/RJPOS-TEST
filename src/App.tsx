import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import type {
  AppScreen,
  Store,
  User,
  POSSession,
} from "@/types/pos";
import { generateTxnId } from "@/data/mockData";
import { clearPosToken, getPosToken, posAuthHeaders, savePosToken } from "@/types/posToken";
import StoreSelectScreen from "@/screens/StoreSelectScreen";
import LoginScreen from "@/screens/LoginScreen";
import LockScreen from "@/screens/LockScreen";
import POSScreen from "@/screens/POSScreen";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

type SessionResponse = {
  success: boolean;
  message?: string;
  authenticated?: boolean;
  user?: User;
  store?: Store;
};

async function readJson<T>(response: Response): Promise<T> {
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

function isValidSessionUser(user: User | undefined): user is User {
  if (!user) return false;

  return (
    String(user.id ?? "").trim() !== "" &&
    String(user.store_id ?? "").trim() !== "" &&
    String(user.role ?? "").toLowerCase() === "cashier" &&
    user.active === true &&
    user.pos_access === true
  );
}

function isValidSessionStore(store: Store | undefined): store is Store {
  if (!store) return false;

  return (
    String(store.id ?? "").trim() !== "" &&
    String(store.name ?? "").trim() !== "" &&
    String(store.branch ?? "").trim() !== ""
  );
}

export default function App() {
  const [screen, setScreen] =
    useState<AppScreen>("store-select");

  const [store, setStore] =
    useState<Store | null>(null);

  const [session, setSession] =
    useState<POSSession | null>(null);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const timer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
  |--------------------------------------------------------------------------
  | RESTORE REAL PHP SESSION ON PAGE REFRESH
  |--------------------------------------------------------------------------
  |
  | NO localStorage/sessionStorage is used.
  |
  | The PHP session created by /auth/pos-login.php is the source of truth.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        setCheckingSession(true);

        const token = getPosToken();

        if (!token) {
          if (mounted) {
            setSession(null);
            setStore(null);
            setScreen("store-select");
          }
          return;
        }

        const response = await fetch(
          `${API_BASE}/auth/pos-session.php`,
          {
            method: "GET",
            headers: posAuthHeaders(),
            cache: "no-store",
          }
        );

        const data =
          await readJson<SessionResponse>(response);

        if (
          !response.ok ||
          !data.success ||
          data.authenticated !== true ||
          !isValidSessionUser(data.user) ||
          !isValidSessionStore(data.store)
        ) {
          clearPosToken();

          if (mounted) {
            setSession(null);
            setStore(null);
            setScreen("store-select");
          }

          return;
        }

        const restoredUser = data.user;
        const restoredStore = data.store;

        /*
         * Extra safety:
         * The PHP session must belong to the same store assigned to
         * the authenticated cashier.
         */
        if (
          Number(restoredUser.store_id) !==
          Number(restoredStore.id)
        ) {
          throw new Error(
            "The authenticated user and store session do not match."
          );
        }

        if (!mounted) return;

        setStore(restoredStore);

        setSession({
          user: restoredUser,
          store: restoredStore,
          cart: [],
          customer: null,
          discount: null,
          view: "cart",
          heldOrders: [],
          txnId: generateTxnId(),
        });

        setScreen("pos");
      } catch (err) {
        console.error(
          "Restore POS session error:",
          err
        );

        /*
         * A failed session check means we cannot safely restore POS.
         * Do not keep stale client-side authentication.
         */
        if (mounted) {
          setSession(null);
          setStore(null);
          setScreen("store-select");
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const resetTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      setScreen((current) =>
        current === "pos"
          ? "lock"
          : current
      );
    }, INACTIVITY_MS);
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => {
    if (
      checkingSession ||
      screen !== "pos" ||
      !session
    ) {
      clearTimer();
      return;
    }

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "touchmove",
      "scroll",
    ] as const;

    const handler = () => resetTimer();

    events.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handler,
        { passive: true }
      );
    });

    resetTimer();

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handler
        );
      });

      clearTimer();
    };
  }, [
    screen,
    session,
    checkingSession,
    resetTimer,
    clearTimer,
  ]);

  const handleStoreSelect = (selectedStore: Store) => {
    setStore(selectedStore);
    setSession(null);
    setScreen("login");
  };

  const handleLoginSuccess = (user: User, token: string) => {
    if (!store) {
      return;
    }

    savePosToken(token);

    /*
     * The backend has already authenticated the user and verified
     * the selected store. Build the in-memory POS session only.
     */
    const nextSession: POSSession = {
      user,
      store,
      cart: [],
      customer: null,
      discount: null,
      view: "cart",
      heldOrders: [],
      txnId: generateTxnId(),
    };

    setSession(nextSession);
    setScreen("pos");
  };

  const handleUnlock = () => {
    if (!session) {
      setScreen("store-select");
      return;
    }

    setScreen("pos");
    resetTimer();
  };

  const handleLock = () => {
    clearTimer();
    setScreen("lock");
  };

  const handleLogout = async () => {
    clearTimer();

    try {
      const token = getPosToken();

      if (token) {
        await fetch(
          `${API_BASE}/auth/pos-logout.php`,
          {
            method: "POST",
            headers: posAuthHeaders(),
          }
        );
      }
    } catch (err) {
      console.error(
        "POS logout request error:",
        err
      );
    } finally {
      clearPosToken();

      /*
       * Always clear local React state even if the server request
       * fails, so the POS screen cannot remain open.
       */
      setSession(null);
      setStore(null);
      setScreen("store-select");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | INITIAL SESSION CHECK UI
  |--------------------------------------------------------------------------
  */

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-9 h-9 mx-auto rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />

          <p className="mt-4 text-sm font-medium text-slate-700">
            Checking POS session...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Verifying your authenticated terminal session.
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SCREEN ROUTING
  |--------------------------------------------------------------------------
  */

  if (screen === "store-select") {
    return (
      <StoreSelectScreen
        onSelect={handleStoreSelect}
      />
    );
  }

  if (
    screen === "login" &&
    store
  ) {
    return (
      <LoginScreen
        store={store}
        onSuccess={handleLoginSuccess}
        onBack={() =>
          setScreen("store-select")
        }
      />
    );
  }

  if (
    screen === "lock" &&
    session
  ) {
    return (
      <LockScreen
        session={session}
        onUnlock={handleUnlock}
      />
    );
  }

  if (
    screen === "pos" &&
    session
  ) {
    return (
      <POSScreen
        session={session}
        onLock={handleLock}
        onLogout={handleLogout}
      />
    );
  }

  /*
   * Safe fallback if React state becomes inconsistent.
   */
  return (
    <StoreSelectScreen
      onSelect={handleStoreSelect}
    />
  );
}
