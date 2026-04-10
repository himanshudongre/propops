# PropOps Data Sources

## Trust Hierarchy

| Tier | Source | Trust Level | What it provides |
|------|--------|-------------|-----------------|
| 1 | IGRS (state-specific) | Highest | Actual registration prices |
| 2 | RERA portals (state + national) | High | Builder/project registrations, complaints |
| 3 | eCourts | High | Litigation against builders |
| 4 | Property Portals | Medium | Current listings, asking prices |
| 5 | WebSearch / WebFetch | Low | Market context, news, reviews |

**Rule: Every data point must be labeled with its source and trust level.**

---

## Registration Price Sources (IGRS)

These are the HIGHEST-TRUST sources — they show what people actually paid, not asking prices.

### IGRS Maharashtra

**URL:** https://freesearchigrservice.maharashtra.gov.in/
**Scraper:** `scripts/igrs-scraper.mjs`

**Coverage:** Mumbai from 1985, other districts from 2002. ~10 lakh registrations/year.

**Data:** Registration date, consideration amount (actual sale price), parties, document type, property identifiers (survey/CTS/milkat/gat/plot).

**Access:** Public, free. Image CAPTCHA for each search (human-in-the-loop).

**Cache:** 7 days in `data/registration-cache/`.

### Kaveri Karnataka

**URL:** https://kaveri.karnataka.gov.in/
**Scraper:** `scripts/scrapers/kaveri-karnataka.mjs`

**Coverage:** All Karnataka districts (Bangalore Urban, Bangalore Rural, Mysore, Mangalore, etc.)

**Data:** Encumbrance Certificate (EC) search, market value (guidance value), deed details.

**Access:** Requires phone + OTP login + CAPTCHA. PropOps uses human-in-the-loop session handoff — user logs in once manually, session saved for 8 hours.

**Cache:** 7 days for results, 8 hours for session in `data/kaveri-session.json`.

### IGRS Telangana

**URL:** https://registration.telangana.gov.in/
**Scraper:** `scripts/scrapers/igrs-telangana.mjs`

**Coverage:** All 33 Telangana districts from 1983 (one of India's oldest digitized datasets).

**Data:** EC search by location (district/mandal/village/survey) or by document number + SRO. Market value lookups for land and apartment rates.

**Access:** Public. Image CAPTCHA on searches (human-in-the-loop).

**Cache:** 7 days in `data/registration-cache/`.

### Additional States (Planned)

- **Delhi (DORIS → NGDRS)** — legacy + current system. Planned.
- **Tamil Nadu (TNREGINET)** — 30-year EC history. Planned.
- **UP (IGRSUP)** — Statewide including Noida/Greater Noida. Planned.
- **Haryana (Jamabandi)** — Less centralized. Research needed.

---

## RERA Portal Sources

### MahaRERA (Maharashtra)

**URL:** https://maharera.maharashtra.gov.in/
**Alt:** https://maharerait.mahaonline.gov.in/
**Scraper:** `scripts/maharera-scraper.mjs`

**Coverage:** All Maharashtra RERA-registered projects (9,300+).

**Data:** Project registration status, promoter details, proposed completion + extensions, total units, complaints, compliance history.

**Access:** Public, free. No CAPTCHA on search.

**Architecture:** Dual-backend — Portal A (Drupal, primary) falls back to Portal B (ASP.NET).

### K-RERA (Karnataka)

**URL:** https://rera.karnataka.gov.in/
**Scraper:** `scripts/scrapers/krera-karnataka.mjs`

**Coverage:** All Karnataka RERA projects (2017 onwards). Bangalore is primary market.

**Data:** Project name, promoter name, RERA number, district/taluk, registration date, project status, complaints per project.

**Access:** Public HTML tables, no CAPTCHA, no auth needed. LOW difficulty.

### TG-RERA (Telangana)

**URL:** https://rera.telangana.gov.in/
**Search:** https://rerait.telangana.gov.in/SearchList/Search
**Scraper:** `scripts/scrapers/tsrera.mjs`

**Coverage:** All Telangana RERA projects. Hyderabad metro is primary market.

**Data:** Project name, promoter name, registration number, quarterly progress reports.

**Access:** Public search (ASP.NET MVC), no CAPTCHA on search. Login required only for complaint filing.

### TNRERA (Tamil Nadu)

**URL:** https://rera.tn.gov.in/
**Scraper:** `scripts/scrapers/tnrera.mjs`

**Coverage:** Tamil Nadu + Andaman & Nicobar, from 2017.

**Data:** Project name, promoter name, registration number, district, completion date.

**Access:** Static PHP pages organized by year. Direct URL pattern: `/cms/reg_projects_tamilnadu/Building/{year}.php`. **EASIEST RERA portal in India** — no CAPTCHA, no auth, just HTML scraping.

### UP-RERA (Uttar Pradesh)

**URL:** https://www.up-rera.in/
**Legacy:** https://uprera.azurewebsites.net/View_projects.aspx
**Scraper:** `scripts/scrapers/uprera.mjs`

**Coverage:** All UP RERA projects. Noida alone has 69+ projects / 37,199+ units. Covers the entire Noida/Greater Noida/Ghaziabad NCR market.

**Data:** Project name, promoter name, district, registration number, status.

**Access:** ASP.NET WebForms on Azure. Public search, ViewState handling required for pagination.

**Key district:** "Gautam Budh Nagar" = Noida + Greater Noida (use this in the district filter).

### Unified RERA Portal (MoHUA National)

**URL:** https://www.rera.mohua.gov.in/
**Scraper:** `scripts/scrapers/rera-national.mjs`

**Coverage:** 35 states/UTs (4 holdouts: Ladakh, Meghalaya, Nagaland, Sikkim). Aggregates 151,113+ projects, 106,545+ agents, 147,383+ disposed complaints.

**Launched:** September 4, 2025 by the Ministry of Housing and Urban Affairs.

**Key pages:**
- `/tracker.html` — weekly national stats
- `/real-estate-regulatory-authorities-of-states-uts.html` — official list of all state portal URLs
- `/key-features-of-RERA.html` — informational
- `/central-advisory-council.html` — CAC page

**Architecture insight:** The MoHUA portal aggregates statistics natively but deep-links back to individual state portals for full project details. Use it for:
- National-level statistics
- Discovering state portal URLs
- Cross-validation with state-level data

Not a replacement for state-specific scrapers.

### Potential: data.gov.in Dataset

**URL:** https://www.data.gov.in/apis/81242853-a9f9-44f4-a100-ea817d9c9ebe

This dataset entry was discovered during research but could not be verified for RERA relevance. If it is a live RERA dataset, it would bypass all scraping (official API with free key). Run `node scripts/scrapers/rera-national.mjs ogd` to investigate.

---

## eCourts (Litigation)

**URL:** https://services.ecourts.gov.in/
**Primary API:** https://court-api.kleopatra.io/ (free wrapper with OAuth)
**Scraper:** `scripts/ecourts-search.mjs`

**Coverage:** Nationwide — 700+ district courts, all High Courts, Supreme Court, NCLT, Consumer Forum.

**Data:** Case type (civil/criminal/consumer/NCLT/writ), status (pending/disposed), filing dates, parties, court, case number, CNR.

**Architecture:**
1. **Primary:** Kleopatra REST API (free tier, handles CAPTCHA upstream, JSON responses)
2. **Fallback:** Playwright scraping of services.ecourts.gov.in (used when API is down)

**Why it matters:** Criminal cases or NCLT proceedings against a builder are critical red flags. Consumer complaint volume indicates buyer dissatisfaction patterns. All of India covered in a single API.

---

## Property Portals (Secondary, Medium Trust)

**Sites:** 99acres.com, MagicBricks.com, Housing.com, NoBroker.com

**Data:** Project name, builder, location, configuration, carpet area, listed/asking price, photos, contact details.

**Trust level:** MEDIUM. These are ASKING prices, not transaction prices. Typically inflated by 10-25% over actual registration prices.

**Rule:** NEVER present portal prices as actual values. Always label as "listed price" or "asking price."

---

## WebSearch / WebFetch

**Used for:**
- Current bank home loan rates (for finance mode)
- Area price trends and news articles
- Infrastructure project announcements
- Builder news, controversies, reviews
- Rental yield estimates from news/portals

**Trust level:** LOW. Results may be outdated, biased, sponsored, or AI-generated. Used for context only, never as primary data.

---

## State Support Matrix

| State | IGRS (Prices) | RERA | eCourts | Production Ready |
|-------|--------------|------|---------|------------------|
| **Maharashtra** (Mumbai, Pune, Thane) | ✅ | ✅ | ✅ | Yes |
| **Karnataka** (Bangalore) | ✅ Kaveri | ✅ K-RERA | ✅ | Yes |
| **Telangana** (Hyderabad) | ✅ | ✅ TG-RERA | ✅ | Yes |
| **Tamil Nadu** (Chennai) | Planned | ✅ TNRERA | ✅ | RERA only |
| **Uttar Pradesh** (Noida, Greater Noida) | Planned | ✅ UP-RERA | ✅ | RERA only |
| **Delhi NCR** (Delhi, Gurgaon) | Planned | Planned | ✅ | eCourts only |

**eCourts coverage is national** via the Kleopatra API — all states covered for legal case lookups.

**IGRS and RERA portals are state-specific** and need individual scrapers. See `scripts/scrapers/state-registry.mjs` for the central config.

---

## Adding a New Source

1. Add state config to `scripts/scrapers/state-registry.mjs` — include portal URLs, tech stack, difficulty, and scraper filename
2. Create the scraper file in `scripts/scrapers/` following the pattern of existing scrapers
3. Update this document and `README.md` with the new support
4. Test with real data and iterate on selector resilience

Each new scraper should follow the existing interface: `list`, `search`, `builder`, and optional `project-details` commands, with JSON output to stdout and error output to stderr.
