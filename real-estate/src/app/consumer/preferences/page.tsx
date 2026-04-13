import { createSupabaseServer } from "@/lib/supabase/server";
import BuyerPreferencesForm from "./preferences-form";

export default async function ConsumerPreferencesPage() {
  const supabase = await createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: prefs } = await supabase
    .from("buyer_preferences")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI тохирол</h1>
        <p className="text-sm text-gray-500 mt-1">Хайж буй зарын шаардлагаа тодорхойлбал AI автоматаар тохирох зар санал болгоно</p>
      </div>
      <BuyerPreferencesForm initialPrefs={prefs} />
    </div>
  );
}
