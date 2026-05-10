import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { decodeJWT } from "@/lib/utils/jwt";
import { WizardHeader } from "../wizard-steps";
import AccountForm from "./account-form";
import WrongSessionNotice from "../../../agent-portal/wrong-session";

export default async function OnboardAccountPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  let isSuperAdmin = false;
  if (session) {
    const role = decodeJWT(session.access_token).user_role;
    if (role === "super_admin") {
      isSuperAdmin = true;
    } else if (role === "tenant_admin") {
      redirect("/agents/onboard/office");
    } else if (role === "agent") {
      redirect("/agent");
    } else if (role === "consumer") {
      redirect("/consumer");
    }
  }

  return (
    <>
      <WizardHeader current="account" />
      <main className="max-w-screen-md mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Оффисоо нээх</h1>
          <p className="text-gray-600 mt-2">
            Эзэмшигчийн бүртгэл болон оффисын нэрээ оруулна уу. Дараагийн алхмууд дээр лого,
            агентууд нэмэх боломжтой.
          </p>
        </div>

        {isSuperAdmin ? (
          <WrongSessionNotice email={session!.user.email ?? ""} superAdminLink="/super" />
        ) : (
          <>
            <AccountForm />
            <p className="text-sm text-gray-500 text-center mt-6">
              Бүртгэл байгаа юу?{" "}
              <Link href="/agent-portal" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Нэвтрэх
              </Link>
            </p>
          </>
        )}
      </main>
    </>
  );
}
