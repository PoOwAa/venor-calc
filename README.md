# VenorCalc

Statikus, frontend-only Venor2 konverziós és ár-optimalizáló alkalmazás Venor2 receptekhez.

## Funkciók az MVP-ben

- Cor Draconis (legendás) 4 Alkimista receptje
- Szél kristály → Cor Draconis (Nyers)
- 3× Rituális kő → 2× Szél kristály
- Aktuális piaci árak szerkesztése
- Árak mentése localStorage-ba
- Top 5 beszerzési útvonal
- Cash required és effective cost összehasonlítása
- GitHub Pages deploy workflow

## Indítás

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## GitHub Pages

1. Hozz létre egy `venor-calc` repositoryt.
2. Pushold a projektet a `main` branchre.
3. GitHubon: **Settings → Pages → Source → GitHub Actions**.
4. A mellékelt workflow buildeli és deployolja az appot.

## Supabase OCR Mentés + Approval

Az OCR screenshot mentéshez és review/approval folyamathoz Supabase konfiguráció szükséges.

### 1. Környezeti változók lokálisan

Másold az `.env.example` fájlt `.env` néven, és töltsd ki:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 2. Supabase adatbázis + storage

1. Nyisd meg a Supabase projektedet.
2. Menj az **SQL Editor** oldalra.
3. Futtasd a [supabase/schema.sql](supabase/schema.sql) scriptet.

Ez létrehozza:

- `box_opening_review_queue` (reviewolandó OCR eredmények)
- `box_opening_approved` (jóváhagyott, trusted adatok)
- `approve_box_opening_submission(...)` és `reject_box_opening_submission(...)` függvények
- `box-opening-screenshots` storage bucket + policyk

Megjegyzés: a jelenlegi policy-k demo célra engedik az `anon` reviewer hozzáférést is, hogy az in-app review oldal auth nélkül működjön. Éles használat előtt szűkítsd vissza authenticated/reviewer role-ra.

### 3. Reviewer folyamat

1. Nyisd meg az appban a **Review** menüpontot.
2. Ellenőrizd a screenshotot és a `submitted_entries` sorokat.
3. Jóváhagyás vagy elutasítás közvetlenül UI-ból.
4. SQL-ből is jóváhagyható:

```sql
select public.approve_box_opening_submission('REVIEW_QUEUE_ROW_UUID', 'ok');
```

Ez átmásolja az adatot a `box_opening_approved` táblába és approved státuszra állítja a queue sort.

### 4. GitHub Pages build env beállítás

Mivel a frontend build időben kapja meg a Supabase URL/kulcs értékeket:

1. GitHub repository → **Settings → Secrets and variables → Actions**
2. Hozd létre ezeket a repository secret-eket:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
3. Push `main` branchre.

Az Actions workflow ezeket automatikusan átadja a buildnek.

## Kötelező Discord Login + Guild/Role ellenőrzés

Az app most kötelező Discord login után működik, és egy Supabase Edge Function ellenőrzi:

- a felhasználó tagja-e egy konkrét Discord szervernek
- opcionálisan rendelkezik-e egy konkrét role-lal

### 1. Supabase Auth: Discord provider

1. Supabase Dashboard → **Authentication → Providers → Discord**
2. Kapcsold be a Discord providert
3. Állítsd be a Discord OAuth app Client ID és Client Secret értékeit
4. Discord appban add hozzá a Supabase callback URL-t (Authentication / Redirect URL)

### 2. Discord bot a guild checkhez

1. Hozz létre egy Discord botot a Developer Portalon
2. Hívd be a botot a szerveredre
3. Mentsd el a bot tokenjét
4. Jegyezd fel:
	- Discord Guild ID
	- opcionális Required Role ID

### 3. Edge Function deploy

Function fájl: [supabase/functions/discord-guild-check/index.ts](supabase/functions/discord-guild-check/index.ts)

Supabase CLI példa:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase secrets set DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... DISCORD_REQUIRED_ROLE_ID=...
supabase functions deploy discord-guild-check
```

Megjegyzés:

- `DISCORD_REQUIRED_ROLE_ID` opcionális. Ha nincs megadva, csak guild tagságot ellenőriz.

### 4. Frontend env (lokál + GitHub Pages)

Lokálisan `.env`:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

GitHub repo secret-ek (Actions):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 5. Biztonsági megjegyzés

A guild/role ellenőrzés szerveroldalon (Edge Function) fut bot tokennel. Ezt ne tedd frontend kódba.
