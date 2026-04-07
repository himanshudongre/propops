# PropOps -- Tracker Mode

> View and manage the property pipeline.

## When to Use
User asks: "show my pipeline", "what's the status?", "update property #3", etc.

## Actions

### View Pipeline
1. Read `data/properties.md`
2. Present summary:
   ```
   Property Pipeline: N total
   - Evaluated: X
   - Shortlisted: Y
   - Site Visit: Z
   - Negotiating: W
   - Watching: V

   Top 3 by score:
   1. #N: Project (Score/10) -- Status
   2. ...
   ```
3. If any properties are stale (Evaluated >30 days with no action), flag them:
   "Property #X was evaluated 45 days ago with no update. Still interested?"

### Update Status
User says: "Mark #3 as Shortlisted" or "Update Godrej Infinity to Site Visit"
1. Find the entry in `data/properties.md` by number or project name
2. Validate new status is canonical (check `templates/states.yml`)
3. Update the status field in-place
4. Confirm: "Updated #3 (Godrej Infinity) from Evaluated to Shortlisted"

### Filter View
User asks: "show me shortlisted" or "properties above 7"
1. Read tracker
2. Filter by requested criteria (status, score range, location, builder)
3. Present filtered results

### Add Notes
User says: "Add note to #5: visited site, construction quality looks good"
1. Find entry by number
2. Append to notes column
3. Confirm

## Rules
- NEVER delete entries from the tracker
- Status changes are logged implicitly by the date system
- If user tries to set an invalid status, suggest the closest canonical status
- Show score interpretation alongside the number (e.g., "7.8/10 -- Consider")
