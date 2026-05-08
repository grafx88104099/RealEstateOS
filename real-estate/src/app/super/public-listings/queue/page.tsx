import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { ListingRowActions } from "@/components/super/public-listings/listing-row-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

export const dynamic = "force-dynamic";

const fmt = new Intl.NumberFormat("mn-MN");
const fmtMnt = (n: number | null) => (n == null ? "—" : `₮${fmt.format(n)}`);

type Card = {
  id: string;
  title: string;
  price: number | null;
  district: string | null;
  status: string;
  rejected_reason: string | null;
  created_at: string;
  deleted_at: string | null;
  tenant: { id: string; name: string } | null;
};

async function fetchByStatus(status: string): Promise<Card[]> {
  const { data } = await supabaseAdmin
    .from("listings")
    .select(
      `id, title, price, district, status, rejected_reason, created_at, deleted_at,
       tenant:tenants(id, name)`,
    )
    .eq("status", status)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as Card[] | null) ?? [];
}

export default async function ModerationQueuePage() {
  const [pending, active, rejected] = await Promise.all([
    fetchByStatus("pending_review"),
    fetchByStatus("active"),
    fetchByStatus("rejected"),
  ]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Хяналтын дараалал</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pending зарыг зөвшөөрөх / татгалзах. Идэвхтэй ба татгалзсан зарууд лавлагаанд.
          </p>
        </div>
        <Link
          href="/super/public-listings"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Буцах
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Column title="Хянуулж буй" tint="bg-yellow-50" cards={pending} emptyText="Шинэ хүсэлт алга" />
        <Column title="Идэвхтэй" tint="bg-green-50" cards={active} emptyText="Идэвхтэй зар алга" maxItems={20} />
        <Column title="Татгалзсан" tint="bg-red-50" cards={rejected} emptyText="Татгалзсан зар алга" maxItems={20} />
      </div>
    </div>
  );
}

function Column({
  title,
  tint,
  cards,
  emptyText,
  maxItems = 50,
}: {
  title: string;
  tint: string;
  cards: Card[];
  emptyText: string;
  maxItems?: number;
}) {
  return (
    <div className={`${tint} rounded-xl p-3`}>
      <div className="px-2 py-2 mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
        <span className="text-xs text-gray-500">{cards.length}</span>
      </div>
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {cards.slice(0, maxItems).map((c) => (
          <div key={c.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
            <Link
              href={`/super/public-listings/${c.id}`}
              className="block font-medium text-gray-900 hover:text-blue-600 text-sm line-clamp-2"
            >
              {c.title}
            </Link>
            <div className="mt-1 text-xs text-gray-500">
              {c.tenant?.name ?? "—"} · {c.district ?? "—"} · {fmtMnt(c.price)}
            </div>
            {c.rejected_reason && (
              <div className="mt-1 text-xs text-red-600 italic">
                «{c.rejected_reason}»
              </div>
            )}
            <div className="mt-2">
              <ListingRowActions
                id={c.id}
                status={c.status}
                isDeleted={!!c.deleted_at}
              />
            </div>
          </div>
        ))}
        {cards.length === 0 && (
          <p className="px-2 py-6 text-xs text-gray-500 text-center">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
