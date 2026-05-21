"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  name: string;
  status: string;
  subscription: string;
}

export default function TenantActions({ id, name, status, subscription }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  async function call(path: string, key: string, body?: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(key);
    setErr(null);
    try {
      const res = await fetch(path, {
        method: body !== undefined ? "POST" : "POST",
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Алдаа");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  async function patch(key: string, body: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(key);
    setErr(null);
    try {
      const res = await fetch(`/api/super/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Алдаа");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBusy(null);
    }
  }

  const isPending = status === "pending_approval";
  const isActive = status === "active";
  const isSuspended = status === "suspended";
  const isRejected = status === "rejected";
  const isPendingEmail = status === "pending_email";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Pending → Approve */}
        {isPending && (
          <button
            onClick={() => call(`/api/super/tenants/${id}/approve`, "approve", {}, `"${name}" оффисыг зөвшөөрөх үү? Эзэмшигчид имэйл илгээгдэнэ.`)}
            disabled={busy !== null}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {busy === "approve" ? "..." : "Зөвшөөрөх"}
          </button>
        )}

        {/* Pending → Reject */}
        {isPending && (
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={busy !== null}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
          >
            Татгалзах
          </button>
        )}

        {/* Rejected → Дахин зөвшөөрөх */}
        {isRejected && (
          <button
            onClick={() => call(`/api/super/tenants/${id}/approve`, "approve", {}, `"${name}" оффисыг дахин нээх үү?`)}
            disabled={busy !== null}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {busy === "approve" ? "..." : "Дахин нээх"}
          </button>
        )}

        {/* Active → Suspend */}
        {isActive && (
          <button
            onClick={() => patch("suspend", { status: "suspended" }, `"${name}" оффисыг түр хаах уу?`)}
            disabled={busy !== null}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            {busy === "suspend" ? "..." : "Түр хаах"}
          </button>
        )}

        {/* Suspended → Reactivate */}
        {isSuspended && (
          <button
            onClick={() => patch("activate", { status: "active" }, `"${name}" оффисыг сэргээх үү?`)}
            disabled={busy !== null}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {busy === "activate" ? "..." : "Сэргээх"}
          </button>
        )}

        {isPendingEmail && (
          <span className="text-xs text-gray-500">Эзэмшигч имэйлээ баталгаажуулаагүй байна</span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-gray-500">Subscription:</label>
          <select
            defaultValue={subscription}
            disabled={busy !== null}
            onChange={(e) => patch("sub", { subscription: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise</option>
          </select>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2">{err}</div>
      )}

      {showRejectModal && (
        <RejectModal
          name={name}
          onClose={() => setShowRejectModal(false)}
          onSubmit={async (reason) => {
            setBusy("reject");
            setErr(null);
            try {
              const res = await fetch(`/api/super/tenants/${id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error ?? "Алдаа");
              setShowRejectModal(false);
              router.refresh();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Алдаа");
            } finally {
              setBusy(null);
            }
          }}
        />
      )}
    </div>
  );
}

function RejectModal({
  name,
  onClose,
  onSubmit,
}: {
  name: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason.trim());
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Татгалзах шалтгаан</h3>
        <p className="text-xs text-gray-500 mb-4">
          <strong>{name}</strong> оффисыг татгалзаж буй шалтгаанаа эзэмшигчид мэдэгдэх имэйлд хавсаргана.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
          maxLength={1000}
          required
          placeholder="Жишээ: Бизнесийн бүртгэлийн мэдээлэл дутуу. Оффисын хаяг тодорхой биш..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none resize-y"
        />
        <p className="text-[11px] text-gray-400 mt-1">{reason.length}/1000</p>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Цуцлах
          </button>
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? "Илгээж байна..." : "Татгалзах"}
          </button>
        </div>
      </form>
    </div>
  );
}
