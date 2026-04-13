// lib/scraper/ai-parser.ts
// Uses OpenAI to parse unstructured Mongolian listing text into structured JSON

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export interface ParsedListing {
  title: string;
  description: string;
  price: number | null;
  rooms: number | null;
  area_sqm: number | null;
  floor: number | null;
  total_floors: number | null;
  district: string | null;
  address: string | null;
  property_type: string;
  listing_type: string;
  contact_phone: string | null;
  confidence: number;
}

const SYSTEM_PROMPT = `Та Монгол хэлний үл хөдлөх хөрөнгийн зарын текст задлагч AI юм.
Өгсөн текстээс дараах мэдээллийг JSON форматаар задална:

{
  "title": "Зарын товч гарчиг (Монголоор, 10 үг хүртэл)",
  "description": "Зарын тайлбар (2-3 өгүүлбэр, Монголоор)",
  "price": <тоо, төгрөгөөр. Жш: 185 сая = 185000000, null хэрэв олдохгүй бол>,
  "rooms": <өрөөний тоо, null хэрэв олдохгүй>,
  "area_sqm": <талбай м², null хэрэв олдохгүй>,
  "floor": <хэдэн давхарт, null хэрэв олдохгүй>,
  "total_floors": <барилгын нийт давхар, null хэрэв олдохгүй>,
  "district": "<дүүргийн товчлол: БЗД, БГД, СБД, ЧД, ХУД, СХД, НД, БХД, БНД>",
  "address": "<дэлгэрэнгүй хаяг: хороо, хороолол, гэх мэт>",
  "property_type": "<apartment|house|land|commercial|office>",
  "listing_type": "<sale|rent>",
  "contact_phone": "<утасны дугаар, null хэрэв олдохгүй>",
  "confidence": <0.0-1.0, мэдээллийн бүрэн/найдвартай байдлын оноо>
}

Дүрэм:
- Зөвхөн JSON буцаах, нэмэлт текст бичихгүй
- Олдоогүй мэдээллийг null гэж тэмдэглэх
- Үнийг ЗААВАЛ төгрөгт хөрвүүлэх (185сая = 185000000)
- Дүүргийг ЗААВАЛ товчлол болгох (Баянзүрх = БЗД)
- confidence: бүх гол field олдвол 0.9+, зарим дутуу 0.6-0.8, ихэнх дутуу 0.3-0.5`;

export async function parseListingWithAI(rawText: string): Promise<ParsedListing | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: rawText.slice(0, 3000) },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as ParsedListing;
    return parsed;
  } catch {
    return null;
  }
}
