# PropOps -- Batch Mode

Evaluate multiple properties in parallel using `claude -p` workers.

---

## Prerequisites

1. Read `modes/_shared.md`
2. Read `modes/_profile.md` (if exists)
3. Read `buyer-brief.md`
4. Properties to evaluate must be listed in `batch/batch-input.tsv` or `data/watchlist.md`

## Trigger

This mode activates when the user says:
- "Evaluate all my watchlist properties"
- "Batch evaluate these properties"
- "Process all pending properties"
- "Evaluate these 10 properties in parallel"

---

## Step 1: Prepare Input

### From Watchlist
Read `data/watchlist.md` and extract unchecked items:
```
- [ ] https://99acres.com/... | Project | Builder | 2BHK | Rs 80L | Pune
```

Convert to `batch/batch-input.tsv`:
```
id\turl\tproject\tbuilder\tnotes
1\thttps://99acres.com/...\tProject Name\tBuilder\tFrom watchlist scan
```

### From User Input
User pastes multiple URLs → parse and create `batch/batch-input.tsv`

---

## Step 2: Run Batch

### Option A: Sequential (within current Claude session)
For small batches (< 5 properties), evaluate one by one:
1. For each property in batch-input.tsv
2. Run full evaluate.md flow
3. Save report, update tracker
4. Show progress: "Evaluated 3/7..."

### Option B: Parallel (using claude -p workers)
For larger batches, use the batch runner:

```bash
./batch/batch-runner.sh --parallel 3
```

Each worker:
1. Reads its assigned URL from batch-input.tsv
2. Uses batch-prompt.md (self-contained evaluation prompt)
3. Saves: report to `reports/`, TSV to `batch/tracker-additions/`
4. Logs to `batch/logs/`

### After Batch
```bash
node scripts/merge-tracker.mjs
node scripts/verify-pipeline.mjs
```

---

## Step 3: Review Results

Present summary:
```
Batch Complete: {X} properties evaluated

| # | Property | Builder | Score | Verdict | Key Finding |
|---|----------|---------|-------|---------|-------------|
| 1 | {name} | {builder} | {X}/10 | {verdict} | {1-line finding} |
| 2 | ... | | | | |

Top matches (score >= 7.0): {count}
Worth investigating: {count}
Skip: {count}

Want me to:
- Compare the top 3?
- Generate negotiation strategy for the best one?
- Send alerts for top matches via Telegram?
```

---

## Step 4: Telegram Alerts

If Telegram is configured, send alerts for top matches:
```bash
node scripts/telegram-bot.mjs alert --property '{"project":"...","score":"7.8",...}'
```

---

## Rules
- NEVER auto-apply or contact builders during batch processing
- Each worker is self-contained (reads buyer-brief, cv at start)
- Merge tracker after ALL workers complete (not during)
- Run verify-pipeline after merge to ensure data integrity
- If a worker fails, log the error and continue with others
- Maximum recommended batch size: 20 properties (to stay within rate limits)
