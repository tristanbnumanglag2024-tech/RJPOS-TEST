import { useEffect, useState } from "react";
import Modal from "@/components/pos/Modal";
import { posAuthHeaders } from "@/types/posToken";

import { API_BASE } from "@/config/api";

type CurrentUser = {
  id: string;
  username?: string;
  name?: string;
  full_name?: string;
  email?: string;
  role?: string;
  active?: boolean;
  pos_access?: boolean;
  store_id?: string;
};

type RefundRequest = {
  id: number;
  request_no: string;
  receipt_no: string;
  requested_by_name: string;
  reason: string;
  notes?: string | null;
  refund_total: number;
  created_at: string;
  items: Array<{
    product_id: number;
    product_name: string;
    sku: string;
    quantity: number;
    refund_amount: number;
  }>;
};

async function readApiResponse(response: Response) {
  const raw = await response.text();

  if (!raw.trim()) {
    throw new Error(
      `Server returned an empty response (HTTP ${response.status}). Check refund-approve.php server/PHP error log.`
    );
  }

  let data: any;

  try {
    data = JSON.parse(raw);
  } catch {
    // Show a useful server-side message instead of "Unexpected end of JSON input".
    const cleaned = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(
      cleaned
        ? `Server returned invalid JSON (HTTP ${response.status}): ${cleaned.slice(0, 300)}`
        : `Server returned invalid JSON (HTTP ${response.status}).`
    );
  }

  return data;
}

export default function RefundApprovalModal({
  currentUser,
  onClose,
}: {
  currentUser: CurrentUser;
  onClose: () => void;
}) {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<RefundRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const role = String(currentUser?.role ?? "").trim().toLowerCase();
  const canApprove = role === "admin" || role === "manager";

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/pos/refund-requests.php`, {
        headers: posAuthHeaders(),
        cache: "no-store",
      });

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load refund requests.");
      }

      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load refund requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async () => {
    if (!selected || !canApprove || processing) return;

    try {
      setProcessing(true);
      setMessage("");
      setError("");

      const response = await fetch(`${API_BASE}/pos/refund-approve.php`, {
        method: "POST",
        headers: posAuthHeaders(true),
        body: JSON.stringify({
          request_id: selected.id,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Refund approval failed.");
      }

      setMessage(
        `Refund approved for ${data.receipt_no ?? selected.receipt_no}.`
      );
      setSelected(null);
      await load();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Refund approval failed."
      );
    } finally {
      setProcessing(false);
    }
  };

  const reject = async () => {
    if (!selected || !canApprove || processing) return;

    const confirmed = window.confirm(
      `Reject refund request ${selected.request_no} for ${selected.receipt_no}?`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setMessage("");
      setActionError("");

      const response = await fetch(`${API_BASE}/pos/refund-reject.php`, {
        method: "POST",
        headers: posAuthHeaders(true),
        body: JSON.stringify({
          request_id: selected.id,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Refund rejection failed.");
      }

      setMessage(
        `Refund request ${data.request_no ?? selected.request_no} rejected.`
      );
      setSelected(null);
      await load();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Refund rejection failed."
      );
    } finally {
      setProcessing(false);
    }
  };

  const displayName =
    currentUser?.name ||
    currentUser?.full_name ||
    currentUser?.username ||
    currentUser?.email ||
    "User";

  return (
    <Modal title="Refund Approvals" onClose={onClose} width="max-w-3xl">
      {!selected ? (
        <div className="p-3 sm:p-4 space-y-3 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
              {message}
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Loading refund requests…
            </div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No pending refund requests.
            </div>
          ) : (
            requests.map((request) => (
              <button
                type="button"
                key={request.id}
                onClick={() => {
                  setSelected(request);
                  setMessage("");
                  setError("");
                  setActionError("");
                }}
                className="w-full text-left border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {request.receipt_no}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {request.request_no} · {request.requested_by_name}
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      {request.reason}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-amber-600">
                      ₱{Number(request.refund_total).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(request.created_at).toLocaleString("en-PH")}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="p-3 sm:p-4 space-y-4 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs font-semibold text-indigo-600"
          >
            ← Back to requests
          </button>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {selected.receipt_no}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Requested by {selected.requested_by_name}
                </p>
              </div>
              <p className="text-lg font-black text-amber-600">
                ₱{Number(selected.refund_total).toFixed(2)}
              </p>
            </div>

            <p className="text-xs text-slate-600 mt-3">{selected.reason}</p>

            {selected.notes && (
              <p className="text-xs text-slate-500 mt-1">
                Notes: {selected.notes}
              </p>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-100">
              {selected.items.map((item, index) => (
                <div
                  key={`${selected.id}-${item.product_id}-${index}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {item.product_name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {item.sku} · Qty {item.quantity}
                    </p>
                  </div>

                  <p className="font-bold text-slate-900 flex-shrink-0">
                    ₱{Number(item.refund_amount).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {canApprove ? (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Manager / Admin approval
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Signed in as{" "}
                  <span className="font-semibold">{displayName}</span>
                  {" · "}
                  <span className="font-semibold capitalize">{role}</span>
                </p>
              </div>

              {message && (
                <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700">
                  {message}
                </div>
              )}

              {actionError && (
                <div className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={reject}
                  disabled={processing}
                  className="w-full h-11 rounded-xl border border-red-200 bg-white text-red-600 text-xs font-bold disabled:opacity-50"
                >
                  {processing ? "Processing…" : "Reject Refund"}
                </button>

                <button
                  type="button"
                  onClick={approve}
                  disabled={processing}
                  className="w-full h-11 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  {processing ? "Processing…" : "Approve Refund"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900">
                Waiting for Manager/Admin approval
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Your current role is{" "}
                <span className="font-semibold capitalize">
                  {role || "cashier"}
                </span>
                . You can view this request, but you cannot approve it.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
