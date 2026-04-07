# PropOps -- Compare Mode

> Side-by-side comparison of 2-4 properties.

## When to Use
User asks: "Compare these properties", "Which one should I pick?", "Compare #1 #3 #5"

## Prerequisites
- Properties must have evaluation reports in `reports/`
- Read each report to extract scores and data

## Comparison Matrix

Build a weighted comparison table:

| Dimension | Weight | Property A | Property B | Property C | Winner |
|-----------|--------|-----------|-----------|-----------|--------|
| Price/sqft | 20% | Rs X | Rs Y | Rs Z | Lowest |
| Builder Score | 15% | X/10 | Y/10 | Z/10 | Highest |
| Location Score | 15% | X/10 | Y/10 | Z/10 | Highest |
| Legal Clarity | 15% | X/10 | Y/10 | Z/10 | Highest |
| Appreciation | 10% | X% est. | Y% est. | Z% est. | Highest |
| Config Match | 10% | X/10 | Y/10 | Z/10 | Highest |
| Livability | 5% | X/10 | Y/10 | Z/10 | Highest |
| Rental Yield | 5% | X% | Y% | Z% | Highest |
| Possession Risk | 3% | X/10 | Y/10 | Z/10 | Highest |
| Hidden Costs | 2% | Rs X total | Rs Y total | Rs Z total | Lowest |
| **Overall** | **100%** | **X/10** | **Y/10** | **Z/10** | |

## Additional Comparisons

### Total Cost Comparison
For each property, calculate total cost including all hidden costs:
| Component | Property A | Property B | Property C |
|-----------|-----------|-----------|-----------|
| Base price | | | |
| GST | | | |
| Stamp duty | | | |
| Registration | | | |
| Maintenance | | | |
| Parking | | | |
| Other | | | |
| **Total** | | | |

### Timeline Comparison
| Factor | Property A | Property B | Property C |
|--------|-----------|-----------|-----------|
| Possession | Date | Date | Date |
| RERA expiry | Date | Date | Date |
| Construction % | X% | Y% | Z% |

### Risk Comparison
List red flags for each property side by side.

## AI Recommendation

After the matrix:
1. Declare winner with reasoning
2. Highlight any red flags that should override score-based ranking
3. If scores are close (within 0.5), highlight the deciding factors
4. Suggest: "Based on your buyer brief, Property A is the best match because..."
5. Note trade-offs: "Property B is cheaper but has higher possession risk"

## Rules
- ALWAYS include total cost (not just base price) in comparisons
- Warn if any property has red flags that should be disqualifying regardless of score
- If properties are in different areas, note that direct price/sqft comparison may be misleading
- Maximum 4 properties per comparison (more gets unreadable)
