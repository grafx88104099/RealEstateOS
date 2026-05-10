import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";
import OfficeProfileForm from "./office-profile-form";

export default async function DashboardProfilePage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const tenantId = payload.tenant_id as string;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, slug, logo_url, settings")
    .eq("id", tenantId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (tenant ?? {}) as any;
  const s = (t.settings ?? {}) as Record<string, unknown>;

  return (
    <div className="p-8 max-w-screen-md mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            aria-label="Буцах"
            className="flex-shrink-0 w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Танилцуулга</h1>
            <p className="text-sm text-gray-500 mt-1">Оффисын лого, мэдээлэл, үйлчилгээгээ нийтэд харуулах</p>
          </div>
        </div>
        <Link
          href={`/offices/${t.slug ?? ""}`}
          target="_blank"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
        >
          Public хуудас
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7m0-7L10 14m-3-7H4a1 1 0 00-1 1v13a1 1 0 001 1h13a1 1 0 001-1v-3" />
          </svg>
        </Link>
      </div>

      <OfficeProfileForm
        initialName={t.name ?? ""}
        initialLogoUrl={t.logo_url ?? ""}
        initialPhone={(s.phone as string) ?? ""}
        initialAddress={(s.address as string) ?? ""}
        initialBio={(s.bio as string) ?? ""}
        initialTagline={(s.tagline as string) ?? ""}
        initialMission={(s.mission as string) ?? ""}
        initialServices={Array.isArray(s.services) ? (s.services as string[]) : []}
        initialEstablishedYear={(s.established_year as number) ?? null}
        initialWebsite={(s.website as string) ?? ""}
      />
    </div>
  );
}
