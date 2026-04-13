// 5 тест зарын embedding үүсгэх script
// node scripts/embed-listings.mjs

import { readFileSync } from "fs";

// .env.local унших
const env = readFileSync(".env.local", "utf-8");
const vars = Object.fromEntries(
  env.split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = vars.OPENAI_API_KEY;

const IDS = [
  "ed886967-2d29-48fe-a76e-8d4b1a30b0e1",
  "4712adf5-54cf-4871-a015-cea62c61669c",
  "803065e1-8d19-4e15-862b-ac71b1cdaba6",
  "8135d474-4166-40dd-a9ff-925b335f5e08",
  "e7b8bcf7-55fa-4be6-8bd5-ac047a2555c6",
];

async function getListings() {
  const ids = IDS.map(id => `id=eq.${id}`).join("&");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/listings?or=(${IDS.map(id => `id.eq.${id}`).join(",")})&select=id,title,description,district,address,price,rooms,property_type,area_sqm,floor,total_floors`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  return res.json();
}

async function embed(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text, dimensions: 1536 }),
  });
  const data = await res.json();
  return data.data[0].embedding;
}

function buildText(l) {
  const parts = [l.title];
  if (l.description) parts.push(l.description);
  if (l.property_type) parts.push(`Төрөл: ${l.property_type}`);
  if (l.district) parts.push(`Дүүрэг: ${l.district}`);
  if (l.address) parts.push(`Хаяг: ${l.address}`);
  if (l.price) parts.push(`Үнэ: ${l.price} MNT`);
  if (l.rooms) parts.push(`${l.rooms} өрөө`);
  if (l.area_sqm) parts.push(`${l.area_sqm} м²`);
  return parts.join(". ");
}

async function saveEmbedding(id, embedding) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/listings?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ embedding: JSON.stringify(embedding) }),
  });
  return res.ok;
}

const listings = await getListings();
console.log(`${listings.length} зар олдлоо`);

for (const listing of listings) {
  process.stdout.write(`  ${listing.title}: `);
  const text = buildText(listing);
  const embedding = await embed(text);
  const ok = await saveEmbedding(listing.id, embedding);
  console.log(ok ? "✓" : "✗");
}

console.log("Дууслаа.");
