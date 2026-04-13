// Test data seed script
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const USER_ID = process.env.SEED_USER_ID ?? "";
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text, dimensions: 1536 }),
  });
  const data = await res.json();
  return data.data[0].embedding;
}

const TEST_LISTINGS = [
  {
    title: "3 өрөө орон сууц СБД-д, шинэ барилга",
    description: "Сүхбаатар дүүрэгт байрлах шинэ барилгын 3 өрөө орон сууц. Тав тухтай, нарлаг, цонх өмнөд зүгт харсан. Лифт, гараж, дулааны систем бүрэн.",
    price: 185_000_000, rooms: 3, area_sqm: 78, floor: 7, total_floors: 14,
    property_type: "apartment", listing_type: "sale", district: "СБД",
    address: "Энхтайваны өргөн чөлөө 15",
  },
  {
    title: "2 өрөө орон сууц БЗД-д, метроны ойролцоо",
    description: "Баянзүрх дүүрэгт 2 өрөө орон сууц. Метроны буудлаас 5 минутын явган зайд. Засвартай, тавилгатай. Гэр бүлд эсвэл хосуудад тохиромжтой.",
    price: 120_000_000, rooms: 2, area_sqm: 55, floor: 3, total_floors: 9,
    property_type: "apartment", listing_type: "sale", district: "БЗД",
    address: "Нарны зам 22",
  },
  {
    title: "4 өрөө том орон сууц ХУД-д, байгалийн дэргэд",
    description: "Хан-Уул дүүрэгт Богдхан уулын ойролцоо 4 өрөө том орон сууц. 120 м² талбайтай, 2 угаалгуур, хашаатай. Амгалан тайван орчинд.",
    price: 320_000_000, rooms: 4, area_sqm: 120, floor: 2, total_floors: 4,
    property_type: "apartment", listing_type: "sale", district: "ХУД",
    address: "Зайсан 8-р хороо",
  },
  {
    title: "Оффис түрээс ЧД-д, төв байршилтай",
    description: "Чингэлтэй дүүргийн төвд 80 м² оффис түрээслэнэ. 4 тусдаа өрөө, хурлын зал, байршил маш сайн. Бизнест тохиромжтой.",
    price: 3_500_000, rooms: 4, area_sqm: 80, floor: 5, total_floors: 8,
    property_type: "office", listing_type: "rent", district: "ЧД",
    address: "Сүхбаатар талбай 1",
  },
  {
    title: "1 өрөө studio СБД-д, залуучуудад тохиромжтой",
    description: "Сүхбаатар дүүрэгт 1 өрөө studio орон сууц. Шинэлэг засвартай, бүх хэрэглэл бүрэн. Оюутан, ажилчдад хямд үнэтэй.",
    price: 75_000_000, rooms: 1, area_sqm: 32, floor: 6, total_floors: 12,
    property_type: "apartment", listing_type: "sale", district: "СБД",
    address: "Бага тойруу 14",
  },
  {
    title: "Байшин зарна БГД-д, том хашаатай",
    description: "Баянгол дүүрэгт 2 давхар байшин зарна. 200 м² нийт талбай, 500 м² хашаа газартай. 5 өрөө, 2 угаалгуур, гараж. Гэр бүлд маш тохиромжтой.",
    price: 650_000_000, rooms: 5, area_sqm: 200, floor: 2, total_floors: 2,
    property_type: "house", listing_type: "sale", district: "БГД",
    address: "Гандантэгчэнлин хороо",
  },
  {
    title: "3 өрөө орон сууц БЗД-д, хямд үнэтэй",
    description: "Баянзүрх дүүрэгт 3 өрөө орон сууц хямд үнэтэй. Засвар хийх шаардлагатай боловч байршил сайн. Анхны худалдааны хувьд маш боломжтой.",
    price: 98_000_000, rooms: 3, area_sqm: 65, floor: 4, total_floors: 9,
    property_type: "apartment", listing_type: "sale", district: "БЗД",
    address: "13-р хороолол",
  },
  {
    title: "Дэлгүүрийн талбай түрээс СХД-д",
    description: "Сонгинохайрхан дүүрэгт дэлгүүрт тохиромжтой 150 м² талбай түрээслэнэ. Замын дэргэд, олон хүн орж гардаг байршил. Ресторан, дэлгүүр, үйлчилгээнд тохиромжтой.",
    price: 5_000_000, rooms: 1, area_sqm: 150, floor: 1, total_floors: 3,
    property_type: "commercial", listing_type: "rent", district: "СХД",
    address: "Аюушийн гудамж 5",
  },
];

async function main() {
  console.log("🚀 Seed эхэлж байна...\n");

  // 1. Tenant үүсгэх
  const { data: tenant, error: tErr } = await db
    .from("tenants")
    .insert({ name: "МН Үл Хөдлөх", slug: "mn-real-estate", subscription: "pro" })
    .select()
    .single();

  if (tErr) {
    console.error("Tenant error:", tErr.message);
    process.exit(1);
  }
  console.log("✓ Tenant үүслээ:", tenant.id);

  // 2. public.users үүсгэх
  const { error: uErr } = await db.from("users").insert({
    id: USER_ID,
    tenant_id: tenant.id,
    role: "tenant_admin",
    email: "grafx88104099@gmail.com",
    full_name: "Admin",
  });

  if (uErr && !uErr.message.includes("duplicate")) {
    console.error("User error:", uErr.message);
    process.exit(1);
  }
  console.log("✓ public.users үүслээ");

  // 3. Listings + embeddings
  console.log("\n📝 Зарууд нэмж байна...");
  for (const listing of TEST_LISTINGS) {
    const slug = `${listing.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-а-яөүё]/gi, "")}-${Date.now()}`;

    const { data: l, error: lErr } = await db.from("listings").insert({
      ...listing,
      tenant_id: tenant.id,
      agent_id: USER_ID,
      slug,
      status: "active",
      published_at: new Date().toISOString(),
      features: [],
    } as never).select().single();

    if (lErr) { console.error("  ✗", listing.title, lErr.message); continue; }

    // Embedding хийх
    const text = [
      listing.title, listing.description,
      `Төрөл: ${listing.property_type}`, `Дүүрэг: ${listing.district}`,
      `Үнэ: ${listing.price}₮`, `${listing.rooms} өрөө`, `${listing.area_sqm}м²`,
    ].join(". ");

    try {
      const embedding = await embed(text);
      await db.from("listings").update({
        embedding: JSON.stringify(embedding),
        embedding_updated_at: new Date().toISOString(),
      } as never).eq("id", l.id);
      console.log("  ✓", listing.title);
    } catch (e) {
      console.error("  ⚠ Embedding алдаа:", listing.title, e);
    }

    await new Promise(r => setTimeout(r, 300)); // rate limit
  }

  console.log("\n✅ Seed дууслаа!");
  console.log(`   Tenant ID: ${tenant.id}`);
  console.log("   http://localhost:3000 руу орж хайлт туршина уу");
}

main();
