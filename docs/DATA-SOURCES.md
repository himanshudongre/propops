# PropOps Data Sources

## Trust Hierarchy

| Tier | Source | Trust Level | What it provides |
|------|--------|-------------|-----------------|
| 1 | IGRS Maharashtra | Highest | Actual registration prices (what people really paid) |
| 2 | MahaRERA Portal | High | Builder RERA status, projects, complaints, compliance |
| 3 | eCourts India | High | Litigation against builders (civil, criminal, NCLT) |
| 4 | Property Portals | Medium | Current listings and asking prices (not actual prices) |
| 5 | WebSearch | Low | Market trends, news, reviews (for context only) |

**Rule: Every data point must be labeled with its source and trust level.**

## IGRS Maharashtra

**URL:** https://freesearchigrservice.maharashtra.gov.in/

**What:** Official property registration records from the Department of Registration and Stamps.

**Data available:**
- Registration date
- Consideration amount (actual sale price)
- Parties (buyer/seller)
- Property details (survey/CTS/milkat number)
- Document type (sale deed, agreement for sale)
- Village, district

**Coverage:**
- Mumbai city & suburbs: from 1985
- Other Maharashtra districts: from 2002
- ~10 lakh registrations per year

**Access:** Public, free. Requires CAPTCHA for each search.

**Why it matters:** This is the ONLY source of what people actually paid. Listing prices on portals are asking prices (often inflated). IGRS data is the legal record.

## MahaRERA

**URL:** https://maharera.maharashtra.gov.in/

**What:** Maharashtra Real Estate Regulatory Authority — regulates builders and projects.

**Data available:**
- Project registration status (registered, lapsed, revoked)
- Promoter/developer details
- Proposed completion date + extensions
- Number of units
- Complaints filed against projects
- Compliance history

**Coverage:** All RERA-registered projects in Maharashtra (~9,300+)

**Access:** Public, free. No CAPTCHA on search.

**Why it matters:** RERA registration is legally required. Unregistered projects have no buyer protection. Complaint history reveals builder reliability.

## eCourts India

**URL:** https://services.ecourts.gov.in/

**API:** https://court-api.kleopatra.io/ (free wrapper API)

**What:** Official court records across India.

**Data available:**
- Case type (civil, criminal, consumer, NCLT, writ)
- Case status (pending, disposed)
- Filing date, hearing dates
- Parties, advocates
- Court name, jurisdiction

**Coverage:** 700+ district courts, High Courts, Supreme Court, NCLT, Consumer Forum

**Access:** Public, free. API handles CAPTCHA upstream.

**Why it matters:** Criminal cases or NCLT proceedings against a builder are critical red flags. Consumer complaint volume indicates buyer dissatisfaction patterns.

## Property Portals

**Sites:** 99acres.com, MagicBricks.com, Housing.com, NoBroker.com

**What:** Current property listings from builders and resellers.

**Data available:**
- Project name, builder, location
- Configuration, carpet area
- Listed/asking price
- Photos, amenities
- Contact details

**Trust level:** MEDIUM. These are asking prices, not transaction prices. They may be inflated by 10-25% over actual registration prices.

**Rule:** NEVER present portal prices as actual values. Always label as "listed price" or "asking price."

## WebSearch

**What:** Google/Bing search results for market context.

**Used for:**
- Area price trends
- Infrastructure project announcements
- Builder news and controversies
- Market sentiment
- Rental yield estimates

**Trust level:** LOW. Results may be outdated, biased, or sponsored content. Used for context only, never as primary data.

## Currently Supported States

| State | IGRS | RERA | eCourts |
|-------|------|------|---------|
| **Maharashtra** | Full support | Full support | Full support |
| Karnataka | Planned | Planned | Via API |
| Delhi NCR | Planned | Planned | Via API |
| Telangana | Planned | Planned | Via API |
| UP | Planned | Planned | Via API |

eCourts coverage is national via the Kleopatra API. IGRS and RERA portals are state-specific and need individual scrapers.
