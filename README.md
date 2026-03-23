# Agency Engine

**Multi-Client SEO & SEA Strategy Platform**

Agency Engine is een SaaS-applicatie voor marketingbureaus waarmee je per klant automatisch een volledige SEO- en SEA-strategie genereert. De app combineert een intake-wizard, DataForSEO-data en een deterministische strategie-engine tot kant-en-klare strategiedocumenten — zonder handmatig zoekwoordenonderzoek.

---

## Wat doet het?

Agency Engine automatiseert het strategietraject dat normaal dagen kost:

1. Je maakt een klant aan en start een project.
2. De intake-wizard verzamelt bedrijfsgegevens, marktinformatie, concurrenten, doelen en prioriteiten.
3. Op basis van de intake haalt de app zoekwoorddata op via DataForSEO (of gebruikt realistische demo-data).
4. De strategie-engine genereert vervolgens een compleet pakket: keyword clusters, pillar-cluster model, contentideeën, campagne-architectuur, advertentieteksten, budgetverdeling en een managementsamenvatting.
5. Alles is direct terug te vinden in een overzichtelijk dashboard.

---

## Kenmerken

**Klant- & projectbeheer** — Multi-client setup met status-tracking per project (intake → processing → completed → archived).

**Intake-wizard** — Vierstaps formulier: bedrijfsgegevens, markt & concurrentie, doelen & strategie, prioriteiten. Alle data wordt opgeslagen en is bewerkbaar.

**SEO-module** — Zoekwoordenonderzoek, automatische keyword clustering, zoekintentie-classificatie (informational / navigational / transactional / commercial), pillar-cluster model met content-ideeën, interne linkstructuur, metadata-aanbevelingen en een prioriteitenmatrix.

**SEA-module** — Campagne-architectuur, advertentiegroepen met keyword sets en match types, negatieve zoekwoorden, RSA headlines & descriptions, budgetverdeling per campagne en biedstrategie-voorstellen.

**Strategische samenvatting** — Executive summary, key findings, aanbevelingen, implementatie-checklist en performance-schattingen.

**DataForSEO-integratie** — Zoekvolumes (Search Volume API), keyword suggesties (Keywords for Keywords API) en domein-gebaseerde keywords (Keywords for Site API). Zonder credentials draait de app op realistische Nederlandse demo-data.

**Dark / Light mode** — Thema-omschakeling via `next-themes`.

**Responsive** — Werkt op desktop en mobiel met een collapsible sidebar.

---

## Tech Stack

| Laag | Technologie |
|------|-------------|
| Frontend | React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Framer Motion |
| Routing | wouter (hash-based) |
| State management | TanStack Query |
| Backend | Express 5, TypeScript |
| Database | SQLite (better-sqlite3) + Drizzle ORM |
| Externe data | DataForSEO API |
| Build tooling | Vite, esbuild, tsx |

---

## Projectstructuur

```
agency-engine/
├── client/                      # Frontend (React)
│   ├── index.html
│   └── src/
│       ├── components/          # Herbruikbare UI-componenten
│       │   ├── app-sidebar.tsx        # Navigatie sidebar
│       │   ├── dashboard-tabs.tsx     # Tab-navigatie op projectdashboard
│       │   ├── intake-wizard.tsx      # 4-staps intake formulier
│       │   ├── keyword-table.tsx      # Zoekwoorden tabel met filters
│       │   ├── sea-overview.tsx       # SEA strategie weergave
│       │   ├── seo-overview.tsx       # SEO strategie weergave
│       │   ├── stat-card.tsx          # KPI kaarten
│       │   ├── status-badge.tsx       # Status labels
│       │   ├── strategy-summary.tsx   # Samenvatting component
│       │   ├── theme-provider.tsx     # Dark/light mode
│       │   └── ui/                    # shadcn/ui basis componenten
│       ├── pages/
│       │   ├── dashboard.tsx          # Hoofdoverzicht
│       │   ├── clients.tsx            # Klantenlijst
│       │   ├── client-detail.tsx      # Klantdetailpagina
│       │   ├── project-intake.tsx     # Intake wizard pagina
│       │   └── project-dashboard.tsx  # Project resultaten dashboard
│       ├── hooks/                     # Custom React hooks
│       ├── lib/                       # Utilities en query client
│       ├── App.tsx                    # Router setup
│       └── main.tsx                   # Entrypoint
├── server/                      # Backend (Express)
│   ├── index.ts                 # Server bootstrap
│   ├── routes.ts                # REST API endpoints
│   ├── storage.ts               # Database laag (Drizzle + SQLite)
│   ├── dataforseo.ts            # DataForSEO API integratie + mock data
│   ├── strategy-generator.ts    # Deterministische strategie-engine
│   ├── vite.ts                  # Vite dev middleware
│   └── static.ts                # Static file serving (productie)
├── shared/
│   └── schema.ts                # Gedeeld datamodel (Drizzle tabellen + Zod schemas + TypeScript types)
├── script/
│   └── build.ts                 # Productie build script
├── .env.example                 # Environment template
├── drizzle.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## Installatie

### Vereisten

- Node.js 18+ (aanbevolen: 20 LTS)
- npm 9+

### Stappen

```bash
# 1. Clone de repository
git clone https://github.com/jouw-org/agency-engine.git
cd agency-engine

# 2. Installeer dependencies
npm install

# 3. Configureer environment variables
cp .env.example .env
```

Open `.env` en vul optioneel je DataForSEO credentials in:

```env
DATAFORSEO_LOGIN=jouw_email@voorbeeld.nl
DATAFORSEO_PASSWORD=jouw_wachtwoord
PORT=5000
NODE_ENV=development
```

> De app werkt volledig zonder DataForSEO credentials. In dat geval worden realistische Nederlandse demo-zoekwoorden gebruikt.

```bash
# 4. Start development server
npm run dev
```

De app draait nu op **http://localhost:5000**.

### Productie

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

---

## API Overzicht

Alle endpoints staan onder `/api`. De belangrijkste:

| Methode | Endpoint | Beschrijving |
|---------|----------|--------------|
| `GET` | `/api/clients` | Alle klanten ophalen |
| `POST` | `/api/clients` | Nieuwe klant aanmaken |
| `GET` | `/api/clients/:id` | Klantdetails |
| `PUT` | `/api/clients/:id` | Klant bijwerken |
| `DELETE` | `/api/clients/:id` | Klant verwijderen |
| `GET` | `/api/clients/:clientId/projects` | Projecten van een klant |
| `POST` | `/api/clients/:clientId/projects` | Nieuw project aanmaken |
| `GET` | `/api/projects/:id` | Projectdetails |
| `POST` | `/api/projects/:id/intake` | Intake data opslaan (upsert) |
| `PUT` | `/api/projects/:id/intake` | Intake data bijwerken |
| `POST` | `/api/projects/:id/generate` | Strategie genereren |
| `GET` | `/api/projects/:id/seo` | SEO-data ophalen |
| `GET` | `/api/projects/:id/sea` | SEA-data ophalen |
| `GET` | `/api/projects/:id/summary` | Strategiesamenvatting |
| `GET` | `/api/projects/:id/dashboard` | Alle projectdata gecombineerd |

---

## Workflow

```
Klant aanmaken → Project starten → Intake invullen → Strategie genereren → Resultaten bekijken
```

**Stap 1 — Klant aanmaken.** Ga naar het klantenbeheerscherm en klik "Nieuwe klant". Vul naam, domein, branche en contactgegevens in.

**Stap 2 — Project starten.** Open de klantpagina en klik "Nieuw project". Het project begint in de status `intake`.

**Stap 3 — Intake invullen.** Doorloop de 4-staps wizard: bedrijfsgegevens (naam, domein, branche, producten/diensten), markt & concurrentie (doelgroep, business model, land, taal, regio, concurrenten), doelen & strategie (SEO- en SEA-doelen, focusdiensten, advertentiebudget, conversietype), en prioriteiten.

**Stap 4 — Strategie genereren.** Klik op "Strategie genereren". De app haalt zoekwoorddata op, clustert keywords, bouwt een pillar-cluster model, genereert campagne-architectuur en schrijft de samenvatting. De projectstatus verandert naar `completed`.

**Stap 5 — Resultaten bekijken.** Navigeer door de tabbladen SEO, SEA en Samenvatting op het projectdashboard.

---

## DataForSEO Integratie

De app gebruikt drie DataForSEO endpoints:

- **Search Volume API** (`/v3/keywords_data/google_ads/search_volume/live`) — Zoekvolumes voor specifieke keywords
- **Keywords for Keywords API** (`/v3/keywords_data/google_ads/keywords_for_keywords/live`) — Gerelateerde zoekwoordsuggesties
- **Keywords for Site API** (`/v3/keywords_data/google_ads/keywords_for_site/live`) — Keywords op basis van een domein

De integratie gebruikt Basic Authentication. Locatie- en taalcodes worden automatisch gemapped vanuit de intake-gegevens. Ondersteunde landen: Nederland, België, Duitsland, VK, VS, Frankrijk, Spanje, Italië, Zweden, Denemarken, Noorwegen, Australië, Canada.

---

## Database

De app gebruikt SQLite met Drizzle ORM. De database (`data.db`) wordt automatisch aangemaakt bij de eerste start. Tabellen: `users`, `clients`, `projects`, `intake_data`, `seo_data`, `sea_data`, `strategy_summary`.

Schema-wijzigingen doorvoeren:

```bash
npm run db:push
```

---

## Scripts

| Commando | Beschrijving |
|----------|--------------|
| `npm run dev` | Start development server met hot reload |
| `npm run build` | Bouwt productie-build (client + server) |
| `npm start` | Start productie-server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Drizzle schema push naar database |

---

## Uitbreidingsmogelijkheden

- Gebruikersauthenticatie en rollen (admin, specialist, klant)
- Export naar PDF of Excel
- Historische data en trendvergelijking
- Google Ads API koppeling voor campagne-import
- Google Search Console integratie
- AI-gegenereerde contentbriefings (bv. via Claude API)
- White-label branding per bureau
- Webhook notificaties
- Multi-taal support

---

## Licentie

Privaat — alleen voor intern bureaugebruik.
