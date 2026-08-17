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

## Új tárgy hozzáadása

`src/data/items.ts`

## Új recept hozzáadása

`src/data/recipes.ts`

A jelenlegi optimizer ciklusvédelmet tartalmaz, és rekurzívan összehasonlítja a piaci vásárlást az ismert receptekkel.
