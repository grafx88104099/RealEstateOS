"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initialName: string;
  initialLogoUrl: string;
  initialPhone: string;
  initialAddress: string;
  initialBio: string;
  initialTagline: string;
  initialMission: string;
  initialServices: string[];
  initialEstablishedYear: number | null;
  initialWebsite: string;
}

export default function OfficeProfileForm({
  initialName,
  initialLogoUrl,
  initialPhone,
  initialAddress,
  initialBio,
  initialTagline,
  initialMission,
  initialServices,
  initialEstablishedYear,
  initialWebsite,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const [tagline, setTagline] = useState(initialTagline);
  const [bio, setBio] = useState(initialBio);
  const [mission, setMission] = useState(initialMission);
  const [services, setServices] = useState<string>(initialServices.join("\n"));
  const [establishedYear, setEstablishedYear] = useState<string>(
    initialEstablishedYear ? String(initialEstablishedYear) : ""
  );
  const [website, setWebsite] = useState(initialWebsite);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/office/logo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLogoUrl(data.url);
      setMsg({ kind: "ok", text: "Лого байршуулагдлаа" });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Upload алдаа" });
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const servicesArr = services
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
    try {
      const res = await fetch("/api/office/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          bio,
          tagline,
          mission,
          services: servicesArr,
          established_year: establishedYear ? Number(establishedYear) : null,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Хадгалах алдаа");
      setMsg({ kind: "ok", text: "Танилцуулга шинэчлэгдлээ" });
      router.refresh();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Алдаа" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Лого + үндсэн нэр */}
      <Section title="Лого ба нэр">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-white shadow-sm flex items-center justify-center text-indigo-400">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="w-full h-full object-cover" />
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
            <p className="text-[11px] text-gray-400 mt-1.5">PNG, JPG, SVG · 5MB-аас бага</p>
          </div>
        </div>
        <Field label="Оффисын нэр" required className="mt-5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </Field>
        <Field label="Уриа үг (богино)" className="mt-4">
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={150}
            placeholder='Жишээ: "Танд тохирох орон сууцыг олоход тань туслана"'
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </Field>
      </Section>

      {/* Танилцуулга текст */}
      <Section title="Бидний тухай">
        <Field label="Танилцуулга">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Манай оффисын тухай, түүх, баг, чиглэл..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-y"
          />
          <p className="text-[11px] text-gray-400 mt-1">{bio.length}/5000</p>
        </Field>
        <Field label="Эрхэм зорилго" className="mt-4">
          <textarea
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Манайхны баримталдаг зарчим, эрхэм зорилго..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-y"
          />
        </Field>
      </Section>

      {/* Үйлчилгээ */}
      <Section title="Үйлчилгээ">
        <Field label="Үйлчилгээний жагсаалт (мөр бүрд нэг)">
          <textarea
            value={services}
            onChange={(e) => setServices(e.target.value)}
            rows={5}
            placeholder={"Орон сууц зарах\nТүрээслэх\nҮнэлгээ\nТусламж зөвлөгөө"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-y font-mono"
          />
        </Field>
      </Section>

      {/* Холбоо барих */}
      <Section title="Холбоо барих">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Утасны дугаар">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9911 1234"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </Field>
          <Field label="Веб хуудас">
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </Field>
          <Field label="Хаяг" className="sm:col-span-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Улаанбаатар, СБД ..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </Field>
          <Field label="Үүсгэн байгуулагдсан он">
            <input
              type="number"
              min="1900"
              max="2100"
              value={establishedYear}
              onChange={(e) => setEstablishedYear(e.target.value)}
              placeholder="2018"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </Field>
        </div>
      </Section>

      {msg && (
        <div className={`rounded-lg px-3 py-2.5 text-sm ${
          msg.kind === "ok"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="flex justify-end gap-2 sticky bottom-4 bg-gradient-to-t from-gray-50 via-gray-50/95 pt-4">
        <button
          type="submit"
          disabled={saving || uploading}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:shadow-md hover:shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Хадгалж байна..." : "Танилцуулга хадгалах"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 text-sm mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
