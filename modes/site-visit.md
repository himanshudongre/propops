# PropOps — Site Visit Mode

Generates a property-specific site visit checklist based on the property type, evaluation data, and buyer brief. Not a generic checklist — one tailored to the specific risks of this property.

---

## Prerequisites

1. Read `modes/_shared.md` — load global rules
2. Read `modes/_profile.md` — load user overrides (if exists)
3. Read `data/buyer-brief.md` — buyer requirements
4. A property must exist in the tracker (either evaluated or in the pipeline)

---

## Trigger

This mode activates when the user says:
- "Generate a site visit checklist for {property}"
- "What should I check when I visit {property}?"
- "I'm visiting {property} tomorrow"
- "Site visit guide for {property}"
- "What to inspect at {property}?"
- "Questions to ask builder for {property}"

---

## Step 1: Load Property Context

Read the property's evaluation report from `reports/` if it exists. Extract:
- Property type (under-construction, ready-to-move, resale, plot)
- Stage (pre-launch, foundation, superstructure, finishing, ready)
- Location and area
- Builder and their track record
- Red flags identified
- Specific risks highlighted (legal, construction, location)

If no evaluation exists, ask the user for minimum info: property name, type, stage, location.

---

## Step 2: Generate Property-Specific Checklist

The checklist is tailored to the property's context. Different property types need different inspections.

### Section A: Pre-Visit Preparation

```markdown
## Before You Visit

### Documents to Carry
- [ ] Your ID proof (Aadhaar, PAN)
- [ ] Pen and notebook (or phone for notes)
- [ ] Camera/phone with good battery
- [ ] Printed evaluation report (from PropOps)
- [ ] List of questions (generated below)
- [ ] Measuring tape (for carpet area verification)
- [ ] Sample wall knock tool (coin or small hammer)
- [ ] Level/spirit level app on phone
- [ ] Flashlight

### Best Time to Visit
- **Weekday morning (10 AM-12 PM):** See actual workforce at site, meet residents heading to work
- **Weekday evening (5-7 PM):** Traffic, noise, commute reality
- **Weekend afternoon:** Lifestyle, amenity usage, community activity
- **AVOID:** Sundays only (site office may be closed, limited residents)

**Visit at least TWICE** — once during week, once during weekend.

### Weather Considerations
- Visit during or right after rain if possible — reveals drainage, leakage, flooding issues
- Check surroundings in summer heat (direct sun, ventilation)
```

### Section B: Location Inspection

This is based on the actual location of the property.

```markdown
## Location Inspection

### Approach and Connectivity
- [ ] How long from main road to project? Note distance and road quality.
- [ ] Single access road or multiple? Single = traffic bottleneck risk.
- [ ] Road width — can emergency vehicles access?
- [ ] Proximity to main arterial road ({specific road name from area})
- [ ] Nearest metro station — walking distance? Time?
- [ ] Public transport frequency (bus stops, auto availability)
- [ ] Peak hour traffic jam — visit at 9 AM or 6 PM on weekday

### Surroundings (Walk 500m radius)
- [ ] Any industrial zones? Check for smells, noise, pollution
- [ ] Garbage dumping sites nearby?
- [ ] High-tension power lines overhead?
- [ ] Open drains or nullahs that might flood?
- [ ] Cell phone signal strength (test network)
- [ ] Street lights at night (walk back at dusk if possible)
- [ ] Safety — is the area well-populated after dark?

### Daily Life Infrastructure
- [ ] Grocery store within walking distance?
- [ ] Pharmacy, clinic, hospital distance
- [ ] Schools — distance and quality
- [ ] Restaurants, food delivery availability
- [ ] Banks, ATMs
- [ ] Petrol pump distance

### Property-Specific Location Risks

{If evaluation flagged flood risk:}
- [ ] Walk the drainage path from project to nearest storm drain
- [ ] Ask residents about last 3 monsoons' water levels
- [ ] Check if project is in a natural depression (lowest point in surroundings)

{If near railway/highway:}
- [ ] Spend 15 minutes listening — how loud is it really?
- [ ] Check if windows face the noise source
- [ ] Ask residents about sleep disruption

{If under flight path:}
- [ ] Count flights per hour during visit
- [ ] Check at different times of day
```

### Section C: Construction Quality (Under-Construction)

```markdown
## Construction Quality Inspection (Under-Construction)

### At the Site

- [ ] **Active construction?** Count workers present. Ask how many hours they work daily.
- [ ] **Equipment?** Is there modern equipment or only manual labor?
- [ ] **Safety gear?** Workers wearing helmets, harnesses? (Tells you about builder's standards)
- [ ] **Material quality?** Look at cement bags (brand), steel rebars (rust?), bricks (quality)
- [ ] **Stage match?** Does actual construction stage match what builder claims?

### Check Completed Floors

- [ ] Walls plumb? Use level app on phone
- [ ] Floor even? Drop a small ball — does it roll?
- [ ] Corner alignment — are they 90 degrees?
- [ ] Tap walls — hollow sound = plaster issue
- [ ] Window frames — any gaps, rust?
- [ ] Electrical points — loose, properly grounded?
- [ ] Water pipes — PVC quality, joint finishing
- [ ] Drainage — slope toward drain?
- [ ] Ceiling height — measure it (RERA mandates minimum)
- [ ] Carpet area — measure and verify against agreement

### Sample Flat (if available)

- [ ] Is it the SAME floor plan as your unit?
- [ ] Is it the SAME specifications as your agreement?
- [ ] Fixtures — same brand/quality?
- [ ] Wall finish — same as agreement?
- [ ] Kitchen counter material match?
- [ ] Bathroom fittings match brand claimed?
- [ ] AC provision — are actually there?

**WARNING:** Sample flats are often built with premium specs to sell the dream. Your actual flat will be delivered with whatever the agreement says — verify with Step-B cross-check.

### Photos to Take

- [ ] Overall project progress (wide shot)
- [ ] Floor-by-floor progress
- [ ] Material being used (close-up)
- [ ] Any visible defects or concerns
- [ ] Workers count and safety equipment
- [ ] Equipment in use
- [ ] Surroundings (drainage, approach road, neighboring structures)
```

### Section D: Construction Quality (Ready-to-Move)

```markdown
## Construction Quality Inspection (Ready-to-Move)

### Exterior

- [ ] Paint condition — freshly painted for show or natural?
- [ ] Cracks on exterior walls (any width — note location)
- [ ] Waterproofing on roof — visit terrace
- [ ] Drainage from roof — clogged?
- [ ] Exterior plumbing — any leaks visible?
- [ ] Elevator condition and load capacity
- [ ] Common staircase condition
- [ ] Emergency exits — clearly marked, accessible?
- [ ] Parking condition — covered? Flooding during rain?
- [ ] Compound wall integrity

### Your Specific Unit

- [ ] Measure carpet area with tape — match agreement?
- [ ] Wall cracks (hairline or wider? Note all)
- [ ] Floor tile alignment and sound (hollow = loose)
- [ ] Ceiling — any staining from leakage above?
- [ ] Doors and windows — open/close smoothly? Lock properly?
- [ ] Plumbing — turn on all taps, check pressure and drainage
- [ ] Electrical — switch on all lights, check sockets
- [ ] Inverter/generator backup works?
- [ ] Internet/cable provision
- [ ] Ventilation — cross-ventilation or stuffy?
- [ ] Natural light during different times
- [ ] Views from windows (permanent? Will new construction block?)

### Building-Level Checks

- [ ] Water supply — how many hours per day? Ask residents
- [ ] Power backup — how long during outage?
- [ ] Security — guards 24/7? CCTV working?
- [ ] Waste disposal system
- [ ] Fire safety — extinguishers, alarms, exits
- [ ] Lift maintenance — AMC in place?
- [ ] Common area maintenance quality
- [ ] Parking allocation and ease
```

### Section E: Talk to Existing Residents (Critical)

```markdown
## Talk to Existing Residents

**This is the most valuable part of any site visit.** Residents have no reason to lie to you. The builder will tell you everything is perfect — residents will tell you the truth.

### Finding Residents

- Morning (7-9 AM): People walking dogs, heading to office
- Evening (5-8 PM): People returning home, children playing
- Weekend: Families in common areas, parks
- Approach politely: "Hi, I'm considering buying here, can I ask you about your experience?"

### Questions to Ask (At Least 3 Different Residents)

**Builder behavior:**
1. How was the possession process? On time or delayed?
2. Did the builder deliver everything as promised in the brochure?
3. Any issues with construction quality that emerged after moving in?
4. Is the builder responsive to complaints even after possession?
5. What happened with the promised amenities — all delivered?

**Society and maintenance:**
6. Is the society formed? Who manages it — builder still or residents?
7. What are the monthly maintenance charges? Any hidden fees?
8. Maintenance corpus — was it properly transferred?
9. Any issues with water supply, power, lift maintenance?
10. Any ongoing disputes with builder?

**Daily life:**
11. What's the daily commute like from here?
12. How's the neighborhood — safe, noisy, friendly?
13. Any issues with parking, security, cleanliness?
14. Is it a good place for {kids/elderly/working professionals}?
15. Would you buy here again if you had to decide today?

### Red Flag Answers

🔴 "Oh, you'll see — things are not what they promised"
🔴 "Most of us are still fighting with the builder"
🔴 "The maintenance is managed by the builder because we can't form a society"
🔴 "We're taking the builder to RERA/court"
🔴 "The amenities were never built / are closed / don't work"
🔴 "Water supply is erratic"
🔴 "Security is just a name — we've had incidents"
🔴 "Lifts break down frequently"
🔴 "I'm trying to sell and move out"

🟢 "Honestly, I've been happy here"
🟢 "The builder delivered on time and was responsive"
🟢 "Good community, well-managed"
🟢 "I'd buy here again"
```

### Section F: Builder Meeting — Questions to Ask

```markdown
## Questions to Ask the Builder's Representative

### About This Specific Unit

1. What is the EXACT carpet area? Can I see the floor plan marked with dimensions?
2. Show me the sanctioned plan for this floor — does it match the marketing material?
3. What is the total all-inclusive cost? Walk me through every charge.
4. When EXACTLY will possession be given? Date on paper, not "approximately".
5. What happens if possession is delayed? Show me the penalty clause.
6. Is this unit in the RERA-registered inventory?
7. How many units in this project have been sold? How many remain?

### About the Project

8. Show me the RERA registration certificate.
9. Show me the commencement certificate.
10. Show me the approved building plan (sanctioned by municipal corp).
11. Show me the title documents and encumbrance certificate.
12. Which bank has approved this project for home loans?
13. What is the maintenance charge calculation and who manages it?
14. When will the society be formed? Who will manage until then?
15. When are all amenities (specific list) expected to be delivered?
16. What is the defect liability period? Per RERA, 5 years is mandatory.
17. Can I inspect the construction before making milestone payments?

### About the Builder

18. How many projects have you completed in this area in the last 5 years?
19. Can I speak to residents of your previously completed projects?
20. Are there any pending RERA complaints against the project? Against your company?
21. What will happen if your company faces financial issues before project completion?

### Trap Questions (Test Honesty)

**Q1:** "I saw online there were some delay complaints for your previous project. Can you tell me about those?"
- Honest builder: Acknowledges, explains, shows what was done to resolve
- Dishonest builder: Denies, dismisses, or gets defensive

**Q2:** "The specifications say 'or equivalent quality'. Who decides what's equivalent?"
- Honest builder: Offers to make it specific in your agreement
- Dishonest builder: Deflects with "don't worry, we use premium brands"

**Q3:** "I'd like to reduce the booking amount below 10% until agreement signing. Can we do that?"
- Compliant builder: Yes, that's per RERA Section 13
- Non-compliant builder: "We have a standard 25% demand"

**Q4:** "Can I get a copy of the agreement to show my lawyer before I sign?"
- Honest builder: "Of course, take your time"
- Dishonest builder: "That's not our policy" or rushed timeline
```

### Section G: Post-Visit Action Items

```markdown
## After the Visit

### Immediate (Same Day)

- [ ] Write down everything you observed while memory is fresh
- [ ] Organize photos with labels
- [ ] List every red flag (builder responses, construction issues, resident feedback)
- [ ] List every positive signal
- [ ] Note what needs verification (documents, promises)

### Within 2-3 Days

- [ ] Request in writing: RERA certificate, sanctioned plan, title documents, OC (if ready)
- [ ] Cross-check resident feedback with online reviews
- [ ] Check RERA portal for this specific project ID
- [ ] Check eCourts for builder litigation (use /propops litigation)
- [ ] Run IGRS search for recent registrations in this project (/propops trend)

### Decision Framework

After the visit, update the property status in tracker:
- **If you're more excited:** Move to "Shortlisted" or "Negotiating"
- **If you're unsure:** Keep as "Site Visit Done", plan a second visit with specific verifications
- **If red flags emerged:** Move to "Passed" with notes on why

### Questions That Should NOT Have Clear Answers Yet

- Final price (should negotiate further)
- Final agreement terms (lawyer review pending)
- Exact possession date (verify against RERA, not builder's word)
- Loan terms (comparison shopping needed)

If the builder is pushing you to decide TODAY, that's a red flag. No legitimate builder needs same-day decisions on a multi-crore purchase.
```

---

## Step 3: Output

Present the checklist as a printable/downloadable format. The user can:
- Print it to physically carry
- Save it to their phone
- Use it as a mental framework

Keep it organized with checkboxes so they can track what they've inspected.

---

## Rules

- **Tailor the checklist to the specific property.** Generic checklists are useless. If the evaluation flagged construction quality concerns, emphasize that section. If it's resale, skip the construction quality parts.
- **Emphasize talking to residents.** This is the single most valuable action in a site visit.
- **Don't rush — schedule visits.** If builder is pushing for same-day decisions, that's a red flag.
- **Always recommend a second visit.** Different time of day reveals different information.
- **Don't replace legal/structural engineer review.** For expensive purchases, recommend hiring a structural engineer for a professional inspection.
