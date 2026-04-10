# Phase 9.2 Verification Results

Real-world testing of PropOps scrapers and data sources. Run on 2026-04-10.

## TL;DR

- ✅ **MoHUA state-links scraper**: WORKS PERFECTLY — retrieved all 30 official state RERA portal URLs
- ✅ **TNRERA scraper**: WORKS — retrieved 10 real 2024 projects, but normalized field parsing needs adjustment
- ❌ **data.gov.in OGD dataset**: Blocked by Access Denied (Cloudflare/geo/bot protection). Needs API key to verify.
- ⚠️ **K-RERA scraper**: Runs without errors but returned 0 results. Table selector mismatch.
- ⚠️ **TG-RERA scraper**: Runs without errors but returned 0 results. District filter + table selectors need adjustment.

## Detailed Results

### MoHUA State-Links (rera.mohua.gov.in)

**Status:** ✅ Production ready

Retrieved all 30 state RERA portal URLs in one call:

| State | Portal URL |
|-------|-----------|
| Andhra Pradesh | https://rera.ap.gov.in/RERA/Views/Home.aspx |
| Bihar | https://rera.bihar.gov.in/ |
| Chhattisgarh | https://rera.cgstate.gov.in/ |
| Goa | https://rera.goa.gov.in/ |
| Gujarat | https://gujrera.gujarat.gov.in/ |
| Haryana | https://haryanarera.gov.in/ |
| Himachal Pradesh | https://hprera.nic.in/ |
| Jharkhand | https://rera.jharkhand.gov.in/ |
| Karnataka | https://rera.karnataka.gov.in/ |
| Kerala | https://rera.kerala.gov.in/ |
| Madhya Pradesh | https://rera.mp.gov.in/ |
| Maharashtra | https://maharera.maharashtra.gov.in/ |
| Odisha | https://rera.odisha.gov.in/ |
| Punjab | https://rera.punjab.gov.in/ |
| Rajasthan | https://rera.rajasthan.gov.in/ |
| Tamil Nadu | https://rera.tn.gov.in/ |
| Telangana | https://rera.telangana.gov.in/ |
| Uttar Pradesh | https://up-rera.in/ |
| Uttarakhand | https://rera.uk.gov.in/ |
| West Bengal (HIRA) | https://hira.wb.gov.in/ |
| Assam | https://rera.assam.gov.in/ |
| Meghalaya | https://meghrera.org.in/ |
| Tripura | https://rera.tripura.gov.in/ |
| Delhi | https://www.rera.delhi.gov.in/ |
| Jammu & Kashmir | https://rera.jk.gov.in/ |
| Puducherry | http://prera.py.gov.in/ |
| (+ 4 more UTs) | |

**Impact:** This is authoritative — PropOps now knows every state's official RERA portal URL straight from MoHUA. Use this to bootstrap new state scrapers.

### TNRERA (Tamil Nadu)

**Status:** ✅ Works, needs field normalization

Retrieved 10 real project records from the 2024 Building registrations page. Example:

```json
{
  "s_no_": "1",
  "project_registration_no_": "TN/16/Building/0001/2024 dated 03/01/2024",
  "name_and_address_of_the_promoter": "Thiru. M.Anand, Managing Partner, M/s. Rohini Colours, Tiruchirappalli – 620003",
  "project_details_and_address": "Project Name: Rohini Colours - Construction of Stilt Floor + 5 Floors...",
  "project_completion_date": "17.05.2031"
}
```

**Issue:** The scraper extracts raw data correctly, but the normalized fields (project_name, promoter_name, registration_no, district) are empty because the TNRERA table has different column names than expected.

**Fix needed:** Update `scripts/scrapers/tnrera.mjs` field normalization:
- `project_registration_no_` → `registration_no`
- `name_and_address_of_the_promoter` → `promoter_name` (extract first name part)
- `project_details_and_address` → `project_name` (parse "Project Name:" prefix)

### data.gov.in OGD Dataset

**Status:** ❌ Blocked — cannot verify

```
"title": "Access Denied",
"description": "Reference #18.5cd7d717..."
```

The dataset page returns Access Denied when accessed without credentials. This is likely:
1. Cloudflare bot protection
2. Geo-restriction (the environment may not be in India)
3. Requires registered data.gov.in API key

**Resolution:** A user with a registered data.gov.in API key would need to test this manually. The dataset could still be a real RERA API — we just can't verify without credentials.

### K-RERA Karnataka

**Status:** ⚠️ Runs without errors, returns 0 results

The scraper navigates to `rera.karnataka.gov.in/viewAllProjects?language=en` successfully but finds no matching tables on the page. This suggests:
1. The page structure uses different selectors than expected
2. The table is loaded via JavaScript after initial page load
3. The project data is inside a non-standard HTML element

**Fix needed:** Inspect the actual page structure with `page.content()` logging, update `krera-karnataka.mjs` to use correct selectors.

### TG-RERA Telangana

**Status:** ⚠️ Runs without errors, returns 0 results

Same as K-RERA — navigates successfully but finds no matching tables. The district filter also silently fails ("District 'Hyderabad' filter not applied via select[name*='District']").

**Fix needed:** The `rerait.telangana.gov.in/SearchList/Search` page likely requires more specific selectors or different filter logic. Needs live page inspection.

## Recommendations

### Immediate (Phase 9.3 — Polish)

1. **Fix TNRERA field normalization** — easy win, adds real value to an already-working scraper
2. **Add page inspection logging to K-RERA and TG-RERA** — capture HTML structure on failure so we can debug
3. **Add `--debug` flag to all scrapers** — save HTML snapshot on zero-result runs

### Medium Priority

4. **Use MoHUA state-links as bootstrap** — for any state without a dedicated scraper, fall back to WebSearch + the authoritative state portal URL from MoHUA
5. **Build self-test mode for each scraper** — runs a known-good query and verifies the result shape matches expectations
6. **Add retry logic** with exponential backoff for transient failures

### Longer Term

7. **Verify OGD dataset with API key** — register at data.gov.in, test the endpoint, document if it's a real RERA API
8. **Add selector version tracking** — when government portals update, track which selector version the scraper is built for
9. **Build scrapers for more states** — use the 30 URLs from MoHUA as the target list

## What Worked Well

- **State-links scraper** returned clean, authoritative data from the official source
- **TNRERA static HTML approach** returned real project records on the first try
- **Error handling** — all scrapers returned structured JSON even when empty, no crashes
- **Caching** — subsequent runs hit the cache immediately, reducing load on government portals

## What Needs Work

- **Selector resilience** — K-RERA and TG-RERA selectors are too narrow
- **Field normalization** — TNRERA returns raw data but empty normalized fields
- **Error messages** — need more detail on WHY a query returned 0 results (was it the navigation, the filter, the table parsing?)
- **Live page inspection** — need tooling to debug selector failures without manual intervention
