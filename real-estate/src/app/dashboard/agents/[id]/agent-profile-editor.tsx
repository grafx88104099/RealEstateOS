"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  agentId: string;
  initial: {
    full_name: string;
    phone: string;
    avatar_url: string;
    bio: string;
    experience_years: number | null;
    specialties: string[];
    languages: string[];
  };
}

const SPECIALTY_SUGGESTIONS = [
  "Орон сууц",
  "Хувийн сууц",
  "Худалдаа",
  "Түрээс",
  "Оффис",
  "Газар",
  "Шинэ барилга",
  "Хоёрдогч зах зээл",
];

const LANGUAGE_SUGGESTIONS = ["Монгол", "Англи", "Орос", "Хятад", "Япон", "Солонгос"];

export default function AgentProfileEditor({ agentId, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [bio, setBio] = useState(initial.bio);
  const [years, setYears] = useState(
    initial.experience_years != null ? String(initial.experience_years) : ""
  );
  const [specialties, setSpecialties] = useState<string[]>(initial.specialties);
  const [languages, setLanguages] = useState<string[]>(initial.languages);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/users/${agentId}/avatar`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setAvatarUrl(data.url);
      setMsg({ kind: "ok", text: "Зураг байршлаа" });
      router.refresh();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Алдаа" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/users/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          bio,
          experience_years: years === "" ? null : Number(years),
          specialties,
          languages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Хадгалах алдаа");
      setMsg({ kind: "ok", text: "Хадгалагдлаа" });
      router.refresh();
      setTimeout(() => setOpen(false), 600);
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Алдаа" });
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Профайл засах
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Агентын профайл</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
            aria-label="Хаах"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
          {/* Зураг */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-white shadow-sm flex items-center justify-center text-indigo-400 flex-shrink-0">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
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
                {uploading ? "Байршуулж байна..." : avatarUrl ? "Зураг солих" : "Зураг нэмэх"}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} disabled={uploading} />
              </label>
              <p className="text-[11px] text-gray-400 mt-1.5">JPG, PNG, WebP · 5MB-аас бага</p>
            </div>
          </div>

          {/* Үндсэн талбар */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Бүтэн нэр">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={200}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </Field>
            <Field label="Утасны дугаар">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9911 1234"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </Field>
          </div>

          {/* Танилцуулга */}
          <Field label="Танилцуулга">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Богино танилцуулга: туршлага, хандлага, харилцагчдад өгөх амлалт..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-y"
            />
            <p className="text-[11px] text-gray-400 mt-1">{bio.length}/1000</p>
          </Field>

          {/* Туршлага */}
          <Field label="Туршлагын жил">
            <input
              type="number"
              min="0"
              max="80"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="5"
              className="w-32 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </Field>

          {/* Мэргэшил */}
          <Field label="Мэргэшил">
            <ChipInput
              values={specialties}
              onChange={setSpecialties}
              suggestions={SPECIALTY_SUGGESTIONS}
              max={8}
              placeholder="Жишээ: Орон сууц"
            />
          </Field>

          {/* Хэл */}
          <Field label="Ярьдаг хэл">
            <ChipInput
              values={languages}
              onChange={setLanguages}
              suggestions={LANGUAGE_SUGGESTIONS}
              max={6}
              placeholder="Жишээ: Англи"
            />
          </Field>

          {msg && (
            <div className={`rounded-lg px-3 py-2.5 text-sm ${
              msg.kind === "ok"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              {msg.text}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Цуцлах
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:shadow-md hover:shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {saving ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ChipInput({
  values,
  onChange,
  suggestions,
  max,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  max: number;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function add(v: string) {
    const t = v.trim();
    if (!t) return;
    if (values.includes(t)) return;
    if (values.length >= max) return;
    onChange([...values, t]);
    setInput("");
  }

  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  const available = suggestions.filter((s) => !values.includes(s));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1 rounded-md"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              className="text-indigo-400 hover:text-indigo-700"
              aria-label="Хасах"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(input);
          } else if (e.key === "Backspace" && !input && values.length > 0) {
            remove(values[values.length - 1]);
          }
        }}
        placeholder={values.length >= max ? `Дээд тал ${max}` : placeholder}
        disabled={values.length >= max}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:bg-gray-50"
      />
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {available.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              disabled={values.length >= max}
              className="text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-0.5 rounded transition-colors disabled:opacity-40"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
