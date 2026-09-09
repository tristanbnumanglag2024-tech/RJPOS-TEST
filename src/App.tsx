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
import {
  clearPosToken,
  getPosToken,
  posAuthHeaders,
  savePosToken,
} from "@/types/posToken";
import LoginScreen, { type ApiLoginUser } from "@/screens/LoginScreen";
import StoreSelectScreen from "@/screens/StoreSelectScreen";
import LockScreen from "@/screens/LockScreen";
import POSScreen from "@/screens/POSScreen";

const API_BASE = "https://sakuracareapi.site/rhea-pos-api";
const INACTIVITY_MS = 30 * 60 * 1000;

type SessionResponse = {
  success: boolean;
  message?: string;
  authenticated?: boolean;
  user?: User;
  store?: Store;
};

type StoreSelectionResponse = SessionResponse & {
  token?: string;
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
    ["cashier", "admin"].includes(
      String(user.role ?? "").trim().toLowerCase()
    ) &&
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

function createPosSession(user: User, store: Store): POSSession {
  return {
    user,
    store,
    cart: [],
    customer: null,
    discount: null,
    view: "cart",
    heldOrders: [],
    txnId: generateTxnId(),
  };
}

export default function App() {
  // Login MUST happen before store selection.
  const [screen, setScreen] = useState<AppScreen>("login");

  const [store, setStore] = useState<Store | null>(null);
  const [session, setSession] = useState<POSSession | null>(null);

  const [checkingSession, setCheckingSession] = useState(true);

  // Stores available to the authenticated POS user.
  // Cashiers receive assigned stores; admins may receive all active stores.
  const [assignedStores, setAssignedStores] = useState<Store[]>([]);

  // User returned after credentials are verified, before a branch is selected.
  const [pendingUser, setPendingUser] = useState<ApiLoginUser | null>(null);

  // Temporary token stored in memory only while the user chooses a store.
  const [selectionToken, setSelectionToken] = useState("");

  const [loadingStoreSelection, setLoadingStoreSelection] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
  |--------------------------------------------------------------------------
  | RESTORE FINAL POS SESSION
  |--------------------------------------------------------------------------
  |
  | Only a FINAL POS token is accepted here.
  | A pending store-selection token is never saved as the final token.
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
            setAssignedStores([]);
            setPendingUser(null);
            setSelectionToken("");
            setScreen("login");
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

        const data = await readJson<SessionResponse>(response);

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
            setAssignedStores([]);
            setPendingUser(null);
            setSelectionToken("");
            setScreen("login");
          }

          return;
        }

        const restoredUser = data.user;
        const restoredStore = data.store;

        // Final POS token must resolve to the same store as the authenticated user.
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
        setSession(
          createPosSession(
            restoredUser,
            restoredStore
          )
        );
        setScreen("pos");
      } catch (err) {
        console.error(
          "Restore POS session error:",
          err
        );

        clearPosToken();

        if (mounted) {
          setSession(null);
          setStore(null);
          setAssignedStores([]);
          setPendingUser(null);
          setSelectionToken("");
          setScreen("login");
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

  /*
  |--------------------------------------------------------------------------
  | LOGIN SUCCESS
  |--------------------------------------------------------------------------
  |
  | This does NOT enter POS yet.
  |
  | The login endpoint has already authenticated users.email/username/password.
  | Cashiers receive assigned stores; admins may receive all active stores.
  |--------------------------------------------------------------------------
  */
  const handleLoginSuccess = (
    user: ApiLoginUser,
    stores: Store[],
    temporarySelectionToken: string
  ) => {
    if (!stores.length || !temporarySelectionToken) {
      return;
    }

    setPendingUser(user);
    setAssignedStores(stores);
    setSelectionToken(
      temporarySelectionToken
    );
    setStore(null);
    setSession(null);
    setScreen("store-select");
  };

  /*
  |--------------------------------------------------------------------------
  | ASSIGNED STORE SELECTION
  |--------------------------------------------------------------------------
  |
  | The selection token proves which authenticated user is making the
  | selection. The backend verifies the selected active store according to
  | the user's role and converts the same pos_sessions row into a final
  | store-bound POS session.
  |--------------------------------------------------------------------------
  */
  const handleStoreSelect = async (
    selectedStore: Store,
    pin: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!pendingUser || !selectionToken) {
      return {
        success: false,
        message: "Your login selection session has expired. Please sign in again.",
      };
    }

    const cleanPin = pin.trim();
    if (!cleanPin) {
      return {
        success: false,
        message: "Please enter your POS PIN.",
      };
    }

    setLoadingStoreSelection(true);

    try {
      const response = await fetch(`${API_BASE}/auth/pos-login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          selection_token: selectionToken,
          store_id: Number(selectedStore.id),
          pin: cleanPin,
        }),
      });

      const data = await readJson<StoreSelectionResponse>(response);

      if (
        !response.ok ||
        !data.success ||
        !data.user ||
        !data.store ||
        !data.token
      ) {
        return {
          success: false,
          message: data.message || "Unable to open the selected store.",
        };
      }

      savePosToken(data.token);
      setStore(data.store);
      setSession(createPosSession(data.user, data.store));
      setPendingUser(null);
      setAssignedStores([]);
      setSelectionToken("");
      setScreen("pos");

      return { success: true };
    } catch (err) {
      console.error("POS store selection error:", err);
      return {
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Unable to verify the POS PIN.",
      };
    } finally {
      setLoadingStoreSelection(false);
    }
  };

  const handleBackToLogin = () => {
    setAssignedStores([]);
    setPendingUser(null);
    setSelectionToken("");
    setScreen("login");
  };

  const handleUnlock = () => {
    if (!session) {
      setScreen("login");
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

      setSession(null);
      setStore(null);
      setAssignedStores([]);
      setPendingUser(null);
      setSelectionToken("");
      setScreen("login");
    }
  };

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

  if (screen === "login") {
    return (
      <LoginScreen
        onSuccess={handleLoginSuccess}
      />
    );
  }

  if (
    screen === "store-select" &&
    pendingUser &&
    selectionToken
  ) {
    return (
      <StoreSelectScreen
        stores={assignedStores}
        loading={loadingStoreSelection}
        onSelect={handleStoreSelect}
        onBack={handleBackToLogin}
      />
    );
  }

  if (screen === "lock" && session) {
    return (
      <LockScreen
        session={session}
        onUnlock={handleUnlock}
      />
    );
  }

  if (screen === "pos" && session) {
    return (
      <POSScreen
        session={session}
        onLock={handleLock}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <LoginScreen
      onSuccess={handleLoginSuccess}
    />
  );
}
