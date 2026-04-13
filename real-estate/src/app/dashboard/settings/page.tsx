import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { TenantSettingsForm } from "@/components/settings/tenant-settings-form";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const payload = decodeJWT(session.access_token);
  const tenantId = payload.tenant_id as string;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug, logo_url, domain, subscription, settings, is_active, created_at")
    .eq("id", tenantId)
    .single();

  if (!tenant) return <p className="p-8 text-gray-400">Tenant олдсонгүй</p>;

  const settings = (tenant.settings ?? {}) as Record<string, unknown>;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Тохиргоо</h1>
          <p className="text-sm text-gray-500 mt-1">Агентлагийн мэдээлэл ба тохиргоо</p>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Буцах</Link>
      </div>

      {/* Tenant Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Агентлагийн мэдээлэл</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Нэр</p>
            <p className="font-medium text-gray-900">{tenant.name}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Slug</p>
            <p className="font-medium text-gray-900">{tenant.slug}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Захиалга</p>
            <p className="font-medium text-gray-900">{tenant.subscription ?? "free"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Бүртгэсэн огноо</p>
            <p className="font-medium text-gray-900">{new Date(tenant.created_at).toLocaleDateString("mn-MN")}</p>
          </div>
        </div>
      </div>

      {/* Editable Settings */}
      <TenantSettingsForm
        tenantId={tenantId}
        currentSettings={{
          commission_rate: (settings.commission_rate as number) ?? 3,
          agent_split: (settings.agent_split as number) ?? 50,
          auto_embed: (settings.auto_embed as boolean) ?? true,
          ai_description: (settings.ai_description as boolean) ?? true,
          ai_lead_score: (settings.ai_lead_score as boolean) ?? true,
          ai_copilot: (settings.ai_copilot as boolean) ?? true,
          default_listing_status: (settings.default_listing_status as string) ?? "active",
          contact_phone: (settings.contact_phone as string) ?? "",
          contact_email: (settings.contact_email as string) ?? "",
          website: (settings.website as string) ?? "",
        }}
      />
    </div>
  );
}
