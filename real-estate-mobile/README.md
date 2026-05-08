# RealEstateOS Mobile (Flutter)

AI агент зуучлагчтай үл хөдлөх хөрөнгийн гар утасны апп. Backend: `../real-estate` (Next.js + Supabase).

## Phase 1 (MVP) — одоогийн scope

- Onboarding + auth (Supabase email/password)
- Home feed (`/api/public/listings`)
- Listing detail
- AI search chat (`/api/ai/search` → carousel cards)
- Sell wizard (4 step) + AI description (`/api/ai/generate-description`)
- Inquiries placeholder, Profile + sign out

## Stack

Flutter 3.x · Dart 3.x · Riverpod 2 · go_router · supabase_flutter · Dio · Hive · Material 3 · `mn_MN` локал.

## Эхлэх

```bash
cp .env.example .env  # утгуудыг бөглөх

flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://YOUR.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJxxx... \
  --dart-define=API_BASE_URL=http://localhost:3000
```

> **Жич**: Android-аар localhost-руу холбогдох бол `API_BASE_URL=http://10.0.2.2:3000`. iOS simulator-т `http://localhost:3000` ажиллана.

Backend урьдчилан асаах: `cd ../real-estate && npm run dev`.

## Folder layout

```
lib/
  core/        api, config, router, theme, utils
  features/    onboarding, auth, home, listing, ai_agent, sell, inquiries, profile
  shared/      models
```

## Phase 2 (төлөвлөгдөж буй)

- `ai_conversations` / `ai_messages` schema + buyer-agent chat (tool-calling)
- `offers` table + AI ↔ AI санал тохиролцоо
- Supabase Realtime + FCM push
- Image upload (Supabase Storage `listing-images` bucket)

Дэлгэрэнгүйг `/Users/huhenege/.claude/plans/glowing-petting-hare.md` файлаас үзнэ үү.
