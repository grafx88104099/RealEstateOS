"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  email: string;
  initialFullName: string;
  initialPhone: string;
  initialAvatarUrl: string;
}

export default function ProfileForm({ email, initialFullName, initialPhone, initialAvatarUrl }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/me/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Алдаа");
      setAvatarUrl(data.url);
      setMsg({ kind: "ok", text: "Зураг байршуулагдлаа" });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Алдаа гарлаа" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, phone, avatar_url: avatarUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Алдаа");
      setMsg({ kind: "ok", text: "Хадгалагдлаа" });
      router.refresh();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Алдаа гарлаа" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-white rounded-2xl border border-gray-200 p-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-white shadow-sm flex items-center justify-center text-indigo-400">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        <div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg cursor-pointer transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0l-4 4m4-4l4 4" />
            </svg>
            {uploading ? "Байршуулж байна..." : "Зураг солих"}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
          </label>
          <p className="text-[11px] text-gray-400 mt-1.5">JPG, PNG, WebP — 5MB-аас бага</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Нэр</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Жишээ: Бат-Эрдэнэ"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Утасны дугаар</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9911 1234"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Имэйл</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
        />
        <p className="text-[11px] text-gray-400 mt-1">Имэйлийг өөрчлөх боломжгүй</p>
      </div>

      {msg && (
        <div className={`rounded-lg px-3 py-2 text-sm ${
          msg.kind === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Хадгалж байна..." : "Хадгалах"}
        </button>
      </div>
    </form>
  );
}
