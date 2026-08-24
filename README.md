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

## Új tárgy hozzáadása

`src/data/items.ts`

## Új recept hozzáadása

`src/data/recipes.ts`

A jelenlegi optimizer ciklusvédelmet tartalmaz, és rekurzívan összehasonlítja a piaci vásárlást az ismert receptekkel.
