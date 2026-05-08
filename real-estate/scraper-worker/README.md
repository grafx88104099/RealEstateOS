# Scraper Worker (Render Docker + Upstash QStash)

Long-running container with warm Playwright Chromium. Drains scrape jobs and
inserts results into Supabase, then notifies the Next.js app to finish the
ingest pipeline (dedup, spam classifier, image upload, listings INSERT).

```
[Upstash QStash cron *—every 30m—*] ─▶ POST https://worker.onrender.com/run
                                          │
                                          ▼
                             Worker fetches Playwright pages
                             Inserts scraped_listings rows
                                          │
                                          ▼
              POST https://your-app.vercel.app/api/scraper/ingest
                                          │
                                          ▼
                  Vercel runs ingestNewScraped()  ─▶  listings(pending_review)
                                          │
                                          ▼
                          Super admin queue → approve → Flutter
```

## Зөвхөн worker үе нь Playwright-тай харьцана. Vercel-д Playwright тохирохгүй.

---

## 1. Render container deploy

```bash
# Local image сайн ажиллана:
cd scraper-worker
npm install
node worker.mjs
# → listening on :7777
```

### Render setup
1. https://dashboard.render.com → New → Web Service
2. Connect to repo, root path = `real-estate/scraper-worker`
3. Region: Singapore (хамгийн ойр Монгол)
4. Plan: Free (sleep after 15min idle) **эсвэл** Starter $7/mo (always-on)
5. Environment variables:
   - `SCRAPER_WORKER_HMAC_SECRET` = `openssl rand -hex 32`
   - `INGEST_CALLBACK_URL` = `https://<your-vercel-app>/api/scraper/ingest`
   - `INGEST_CALLBACK_TOKEN` = `openssl rand -hex 32`
   - `NEXT_PUBLIC_SUPABASE_URL` = (Supabase project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` = (Supabase service role key)
   - `OPENAI_API_KEY` = (OpenAI key)
6. Deploy → URL гарна, ж: `https://scraper-worker-abcd.onrender.com`

### Vercel side
Дээрх HMAC secret + INGEST_CALLBACK_TOKEN-ийг Vercel project settings-д ижил утгаар нэмэх ба:
- `SCRAPER_WORKER_URL` = Render URL (cron handler ийгээр шилжинэ)
- `SCRAPER_WORKER_HMAC_SECRET` = ижил утга
- `INGEST_CALLBACK_TOKEN` = ижил утга

---

## 2. Upstash QStash schedule

QStash нь нэг хязгаарлагдмал [free tier](https://upstash.com/pricing/qstash) (500 messages/day) санал болгодог — энэ proj-д хангалттай.

```bash
# 1. https://console.upstash.com/qstash → Schedules tab
# 2. Create new schedule:
#    Destination: https://<vercel-app>/api/scraper/cron
#    Method: POST
#    Headers: Authorization: Bearer <SCRAPER_CRON_SECRET>
#    Cron: */30 * * * *
#    Body: {}
```

QStash 30 минут тутамд `/api/scraper/cron`-руу POST хийнэ. Cron handler нь due sources-ыг олж Render worker-руу dispatch хийнэ. Worker scrape хийгээд ingest endpoint-руу буцаана.

---

## 3. Дэв-д турших

`SCRAPER_WORKER_URL` env-ийг **тохируулахгүй** үлдээх. Cron handler нь in-process drain хийнэ (Playwright local-д суусан байх ёстой):
```bash
npx playwright install chromium
curl -X POST -H "Authorization: Bearer devkey123" http://localhost:3000/api/scraper/cron
```

`SCRAPER_WORKER_URL` тохируулах ⇒ external worker mode.

---

## 4. Cost

- Render Starter: $7/mo
- Upstash QStash: free (500 msg/day)
- OpenAI: ~$0.40/өдөр (1000 зар)
- **Нийт: ~$20/сар**

## 5. Бүтэц

```
scraper-worker/
├── Dockerfile        — playwright base image
├── package.json      — supabase-js + playwright
├── worker.mjs        — http server + scrape loop
├── .env.example
└── README.md (this file)
```
