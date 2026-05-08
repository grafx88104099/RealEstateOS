"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteUserModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  function handleClose() {
    setOpen(false);
    setInviteLink(null);
    setForm({ email: "", full_name: "" });
    setError(null);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "agent" }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Алдаа гарлаа");
      setLoading(false);
      return;
    }

    setInviteLink(data.invite_link);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        + Агент урих
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Агент урих</h2>

            {inviteLink ? (
              <div className="space-y-4">
                <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  ✓ Агент амжилттай нэмэгдлээ. Доорх холбоосыг агентад илгээнэ үү — нэвтэрч нүүц үгээ тохируулна.
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Урилгын холбоос:</p>
                  <p className="text-xs text-gray-800 break-all font-mono">{inviteLink}</p>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteLink); }}
                  className="w-full border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Холбоос хуулах
                </button>
                <button
                  onClick={handleClose}
                  className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Хаах
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Имэйл *</label>
                  <input
                    type="email" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="agent@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Нэр</label>
                  <input
                    type="text" value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Батбаяр"
                  />
                </div>

                <div className="bg-blue-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-blue-700">Урилгын холбоос үүсгэгдэх бөгөөд та агентад дамжуулна. Агент холбоосоор орж нүүц үгээ тохируулна.</p>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {loading ? "Үүсгэж байна..." : "Урилга үүсгэх"}
                  </button>
                  <button type="button" onClick={handleClose}
                    className="flex-1 text-gray-600 text-sm font-medium py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                    Цуцлах
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
