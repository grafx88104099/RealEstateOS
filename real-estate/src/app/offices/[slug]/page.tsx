import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";

function fmtPrice(p: number) {
  if (p >= 1_000_000_000) return `${(p / 1_000_000_000).toFixed(1)} тэрбум`;
  if (p >= 1_000_000) return `${Math.round(p / 1_000_000)} сая`;
  return p.toLocaleString();
}

export default async function OfficePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, logo_url, settings, created_at, is_active")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  if (!tenant) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenant as any;
  if (!t.is_active) notFound();

  const s = (t.settings ?? {}) as Record<string, unknown>;
  const tagline = (s.tagline as string) || "";
  const bio = (s.bio as string) || "";
  const mission = (s.mission as string) || "";
  const services = Array.isArray(s.services) ? (s.services as string[]) : [];
  const phone = (s.phone as string) || "";
  const address = (s.address as string) || "";
  const website = (s.website as string) || "";
  const establishedYear = (s.established_year as number) || null;

  const [agentsRes, listingsRes] = await Promise.all([
    supabaseAdmin
      .from("users")
      .select("id, full_name, avatar_url, phone")
      .eq("tenant_id", t.id).eq("role", "agent").eq("is_active", true).is("deleted_at", null)
      .limit(20),
    supabaseAdmin
      .from("listings")
      .select("id, title, price, district, rooms, area_sqm, listing_type")
      .eq("tenant_id", t.id).eq("status", "active").is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(6),
  ]);

  const agents = (agentsRes.data ?? []) as { id: string; full_name: string | null; avatar_url: string | null; phone: string | null }[];
  const listings = (listingsRes.data ?? []) as {
    id: string; title: string; price: number; district: string | null; rooms: number | null; area_sqm: number | null; listing_type: string;
  }[];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top header */}
      <header className="border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-6 py-3.5 flex items-center gap-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-onest)] font-extrabold text-gray-900 text-2xl tracking-tight lowercase leading-none hover:text-indigo-600 transition-colors"
          >
            meni
          </Link>
          <div className="flex-1" />
          <Link
            href="/"
            className="text-[13px] text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            ← Нийтийн хуудас
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/40 border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-6 py-16 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 ring-4 ring-white shadow-lg flex items-center justify-center text-indigo-400">
            {t.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.75z" />
              </svg>
            )}
          </div>
          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            {t.name}
          </h1>
          {tagline && (
            <p className="mt-4 text-lg text-gray-600 max-w-2xl leading-relaxed">{tagline}</p>
          )}
          {establishedYear && (
            <p className="mt-3 text-sm text-gray-400">{establishedYear} оноос үйл ажиллагаа явуулж байна</p>
          )}
        </div>
      </section>

      {/* About + services */}
      {(bio || mission || services.length > 0) && (
        <section className="px-6 py-16">
          <div className="max-w-screen-xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {bio && (
              <div className="lg:col-span-2">
                <h2 className="text-xl font-bold text-gray-900">Бидний тухай</h2>
                <p className="mt-4 text-gray-600 leading-relaxed whitespace-pre-line">{bio}</p>
                {mission && (
                  <div className="mt-6 rounded-xl bg-indigo-50 border border-indigo-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Эрхэм зорилго</p>
                    <p className="mt-1.5 text-sm text-indigo-900 leading-relaxed whitespace-pre-line">{mission}</p>
                  </div>
                )}
              </div>
            )}
            {services.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900">Үйлчилгээ</h2>
                <ul className="mt-4 space-y-2">
                  {services.map((srv) => (
                    <li key={srv} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{srv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Agents */}
      {agents.length > 0 && (
        <section className="px-6 py-16 bg-gray-50 border-y border-gray-200">
          <div className="max-w-screen-xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Агентууд</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {agents.map((a) => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden mx-auto bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-400">
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatar_url} alt={a.full_name ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900 truncate">{a.full_name || "—"}</p>
                  {a.phone && <p className="text-xs text-gray-500 mt-0.5 truncate">{a.phone}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Listings */}
      {listings.length > 0 && (
        <section className="px-6 py-16">
          <div className="max-w-screen-xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Идэвхтэй зарууд</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((l) => (
                <Link
                  key={l.id}
                  href={`/listings/${l.id}`}
                  className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                    l.listing_type === "sale" ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    {l.listing_type === "sale" ? "Зарах" : "Түрээслэх"}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-gray-900 line-clamp-2">{l.title}</p>
                  <p className="mt-1.5 text-base font-bold text-gray-900">₮{fmtPrice(l.price)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {l.rooms ? `${l.rooms} өр · ` : ""}
                    {l.area_sqm ? `${l.area_sqm} м² · ` : ""}
                    {l.district ?? ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="px-6 py-16 bg-gray-50 border-t border-gray-200">
        <div className="max-w-screen-md mx-auto text-center">
          <h2 className="text-xl font-bold text-gray-900">Холбоо барих</h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {phone && (
              <ContactCell label="Утас" value={phone} href={`tel:${phone}`} />
            )}
            {address && (
              <ContactCell label="Хаяг" value={address} />
            )}
            {website && (
              <ContactCell label="Веб" value={website.replace(/^https?:\/\//, "")} href={website} />
            )}
          </div>
          {!phone && !address && !website && (
            <p className="mt-4 text-sm text-gray-400">Холбоо барих мэдээлэл оруулаагүй байна</p>
          )}
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 py-4 text-[12px] text-gray-500 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/" className="font-[family-name:var(--font-onest)] font-extrabold text-gray-700 text-base lowercase tracking-tight leading-none hover:text-gray-900">
            meni
          </Link>
          <span>© {new Date().getFullYear()} meni</span>
          <span className="flex-1" />
          <Link href="/" className="hover:text-gray-900">Нийтийн хайлт</Link>
          <Link href="/agents" className="hover:text-gray-900">Агент</Link>
        </div>
      </footer>
    </div>
  );
}

function ContactCell({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm text-gray-900 mt-1 break-words">{value}</p>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel="noreferrer"
        className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
      >
        {inner}
      </a>
    );
  }
  return <div className="bg-white rounded-xl border border-gray-200 p-4">{inner}</div>;
}
