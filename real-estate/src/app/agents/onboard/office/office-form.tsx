"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialName: string;
  initialLogoUrl: string;
  initialPhone: string;
  initialAddress: string;
  initialBio: string;
}

export default function OfficeForm({
  initialName,
  initialLogoUrl,
  initialPhone,
  initialAddress,
  initialBio,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [bio, setBio] = useState(initialBio);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/office/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLogoUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload алдаа");
    } finally {
      setUploading(false);
    }
  }

  async function save(redirectTo: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/office/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, address, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Хадгалах алдаа");
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа");
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-5">
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-white shadow-sm flex items-center justify-center text-indigo-400">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z" />
            </svg>
          )}
        </div>
        <div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg cursor-pointer transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0l-4 4m4-4l4 4" />
            </svg>
            {uploading ? "Байршуулж байна..." : (logoUrl ? "Лого солих" : "Лого нэмэх")}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogo} disabled={uploading} />
          </label>
          <p className="text-[11px] text-gray-400 mt-1.5">PNG, JPG, SVG — 5MB-аас бага</p>
        </div>
      </div>

      <Field label="Оффисын нэр" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Утасны дугаар">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9911 1234"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </Field>
        <Field label="Хаяг">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Улаанбаатар, СБД ..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </Field>
      </div>

      <Field label="Тайлбар">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Манай оффис нь..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
        />
      </Field>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm px-3 py-2.5">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => save("/agents/onboard/agents")}
          disabled={saving || uploading}
          className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2 transition-colors"
        >
          Дараа нь →
        </button>
        <button
          type="button"
          onClick={() => save("/agents/onboard/agents")}
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:shadow-md hover:shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Хадгалж байна..." : (
            <>
              Үргэлжлүүлэх
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
