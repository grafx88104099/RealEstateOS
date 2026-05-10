import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decodeJWT } from "@/lib/utils/jwt";
import { WizardHeader } from "../wizard-steps";
import OfficeForm from "./office-form";

export default async function OnboardOfficePage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/agents/onboard/account");

  const payload = decodeJWT(session.access_token);
  const role = payload.user_role;
  const tenantId = payload.tenant_id as string | undefined;
  if (role !== "tenant_admin" || !tenantId) redirect("/agents/onboard/account");

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, logo_url, settings")
    .eq("id", tenantId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (tenant as any)?.settings ?? {};

  return (
    <>
      <WizardHeader current="office" />
      <main className="max-w-screen-md mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Оффисын мэдээлэл</h1>
          <p className="text-gray-600 mt-2">
            Лого болон холбоо барих мэдээллээ нэмэх. Хожим хэзээ ч засах боломжтой.
          </p>
        </div>
        <OfficeForm
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialName={(tenant as any)?.name ?? ""}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialLogoUrl={(tenant as any)?.logo_url ?? ""}
          initialPhone={s.phone ?? ""}
          initialAddress={s.address ?? ""}
          initialBio={s.bio ?? ""}
        />
      </main>
    </>
  );
}
