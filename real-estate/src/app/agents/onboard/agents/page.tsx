import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { WizardHeader } from "../wizard-steps";
import AgentsForm from "./agents-form";

export default async function OnboardAgentsPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/agents/onboard/account");

  const role = decodeJWT(session.access_token).user_role;
  if (role !== "tenant_admin") redirect("/agents/onboard/account");

  return (
    <>
      <WizardHeader current="agents" />
      <main className="max-w-screen-md mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Анхны агентуудаа урь</h1>
          <p className="text-gray-600 mt-2">
            Агентуудаа имэйлээр нь урих боломжтой. Тус бүрд бүртгэлийн линк үүсгэж өгнө —
            агентууд тэр линкээр орж нууц үгээ тохируулна.
          </p>
        </div>
        <AgentsForm />
      </main>
    </>
  );
}
