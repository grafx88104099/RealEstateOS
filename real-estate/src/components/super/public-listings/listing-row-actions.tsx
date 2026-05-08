"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Action = "approve" | "reject" | "delete" | "restore" | "archive";

interface Props {
  id: string;
  status: string;
  isDeleted: boolean;
}

export function ListingRowActions({ id, status, isDeleted }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    setError(null);
    const res = await fetch(`/api/admin/public-listings/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(() => router.refresh());
  };

  const run = (action: Action) => {
    if (action === "approve") return call({ status: "active" });
    if (action === "archive") return call({ status: "archived" });
    if (action === "delete") return call({ soft_delete: true });
    if (action === "restore") return call({ restore: true });
    if (action === "reject") return setShowReject(true);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isDeleted ? (
        <button
          onClick={() => run("restore")}
          disabled={isPending}
          className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
        >
          Сэргээх
        </button>
      ) : (
        <>
          {status === "pending_review" && (
            <>
              <button
                onClick={() => run("approve")}
                disabled={isPending}
                className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100"
              >
                Зөвшөөрөх
              </button>
              <button
                onClick={() => run("reject")}
                disabled={isPending}
                className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
              >
                Татгалзах
              </button>
            </>
          )}
          {status === "active" && (
            <button
              onClick={() => run("archive")}
              disabled={isPending}
              className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Архивлах
            </button>
          )}
          {status === "rejected" && (
            <button
              onClick={() => run("approve")}
              disabled={isPending}
              className="px-2 py-1 text-xs rounded bg-green-50 text-green-700 hover:bg-green-100"
            >
              Зөвшөөрөх
            </button>
          )}
          <button
            onClick={() => run("delete")}
            disabled={isPending}
            className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
          >
            Устгах
          </button>
        </>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Татгалзах шалтгаан</h3>
            <textarea
              autoFocus
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="ж: хуурамч мэдээлэл, зураг чанаргүй..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowReject(false);
                  setReason("");
                }}
                className="px-3 py-1.5 text-sm rounded text-gray-700 hover:bg-gray-100"
              >
                Болих
              </button>
              <button
                onClick={async () => {
                  await call({ status: "rejected", rejected_reason: reason });
                  setShowReject(false);
                  setReason("");
                }}
                disabled={isPending || !reason.trim()}
                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Татгалзах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
