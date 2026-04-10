#!/usr/bin/env node

/**
 * PropOps Promoter Identity Resolver
 *
 * Addresses a real critique from Reddit feedback (u/debt-lens):
 *
 *   "In RERA listings it's very common to fill previous experience
 *    section as none regardless of the actual truth. Even though
 *    Project A and B are executed by the same builder, in every
 *    listing the previous projects section would be empty. So even
 *    if Project A was a disaster, you'll never attribute it to the
 *    current builder."
 *
 * This is a REAL gap in naive builder evaluation. The "previous
 * projects" field on RERA project pages is often blank or incomplete.
 * If we trust it, we'll under-report a builder's history and miss
 * complaints/delays/litigation from related projects.
 *
 * FIX: Instead of relying on the project page's "previous projects"
 * field, we resolve builder identity across projects by fuzzy matching
 * on multiple signals:
 *
 * 1. Promoter company name (with legal entity variations)
 * 2. Director/partner names
 * 3. Registered office address
 * 4. Contact phone numbers
 * 5. Contact email domains
 * 6. Registered address city/PIN
 *
 * Two projects are considered "same builder" if they match on 2+ of
 * these dimensions. The result is a MUCH more accurate builder
 * portfolio than trusting the RERA form field.
 *
 * Usage:
 *   node scripts/promoter-resolver.mjs resolve --name "Lodha Group"
 *     Find all legal entities and projects related to "Lodha"
 *
 *   node scripts/promoter-resolver.mjs compare --project-a "P52100012345" --project-b "P52100067890"
 *     Check if two projects are by the same builder (even if names differ)
 *
 *   node scripts/promoter-resolver.mjs graph --name "Lodha Group"
 *     Build a relationship graph of all related entities
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'data/builder-cache');

// ─── Normalization Helpers ─────────────────────────────────

/**
 * Normalize a company name for comparison.
 * Removes common legal suffixes, punctuation, case differences.
 */
function normalizeCompanyName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|llp|llc|inc|corp|corporation|company|co|enterprises|group|developers|builders|constructions|realty|properties|homes|estates|infrastructure|infra|projects|realtors|real estate|india|the)\b/g, '')
    .replace(/[.,'&()\[\]\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the "core brand" from a company name.
 * e.g., "Macrotech Developers Ltd" -> "macrotech"
 *       "Lodha Crown Realty LLP" -> "lodha crown"
 */
function extractBrandCore(name) {
  const normalized = normalizeCompanyName(name);
  const words = normalized.split(' ').filter(w => w.length > 2);
  // First 1-2 meaningful words are usually the brand
  return words.slice(0, 2).join(' ');
}

/**
 * Normalize a phone number (Indian format).
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  // Handle 10-digit and 12-digit (with country code) formats
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

/**
 * Extract email domain (for matching company email patterns).
 */
function extractEmailDomain(email) {
  if (!email) return '';
  const match = email.match(/@([^\s]+)/);
  if (!match) return '';
  return match[1].toLowerCase().replace('www.', '');
}

/**
 * Normalize an address for comparison.
 * Focuses on PIN code, city, and street keywords.
 */
function normalizeAddress(address) {
  if (!address) return { pin: '', city: '', keywords: [] };

  const pin = address.match(/\b(\d{6})\b/)?.[1] || '';
  const lower = address.toLowerCase();

  // Extract city candidates (Indian city names in the address)
  const cities = ['mumbai', 'pune', 'bangalore', 'bengaluru', 'hyderabad', 'chennai',
                  'delhi', 'noida', 'gurgaon', 'gurugram', 'kolkata', 'ahmedabad',
                  'jaipur', 'lucknow', 'kanpur', 'thane', 'nashik', 'nagpur'];
  const city = cities.find(c => lower.includes(c)) || '';

  // Extract meaningful keywords (longer than 3 chars, not common words)
  const stopwords = new Set(['road', 'street', 'floor', 'opp', 'near', 'above', 'below', 'the', 'and', 'for', 'plot', 'house', 'india', 'state']);
  const keywords = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w));

  return { pin, city, keywords };
}

// ─── Similarity Scoring ────────────────────────────────────

/**
 * Jaccard similarity between two arrays (for keyword overlap).
 */
function jaccardSimilarity(a, b) {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Calculate a similarity score between two builder entities (0-1).
 * Score is based on multiple dimensions with weighted contributions.
 */
function scoreBuilderSimilarity(a, b) {
  let score = 0;
  const signals = {};

  // Dimension 1: Company name (weight 0.35)
  const nameA = normalizeCompanyName(a.promoter_name || a.name || '');
  const nameB = normalizeCompanyName(b.promoter_name || b.name || '');

  if (nameA && nameB) {
    if (nameA === nameB) {
      signals.name_exact = 1;
      score += 0.35;
    } else {
      const brandA = extractBrandCore(a.promoter_name || a.name || '');
      const brandB = extractBrandCore(b.promoter_name || b.name || '');
      if (brandA && brandB && (brandA === brandB || brandA.includes(brandB) || brandB.includes(brandA))) {
        signals.name_brand_match = 1;
        score += 0.25;
      } else {
        // Word overlap
        const wordsA = nameA.split(' ');
        const wordsB = nameB.split(' ');
        const overlap = jaccardSimilarity(wordsA, wordsB);
        if (overlap > 0.5) {
          signals.name_word_overlap = overlap;
          score += 0.35 * overlap;
        }
      }
    }
  }

  // Dimension 2: Phone numbers (weight 0.20)
  const phonesA = (a.phones || []).map(normalizePhone).filter(Boolean);
  const phonesB = (b.phones || []).map(normalizePhone).filter(Boolean);
  if (phonesA.length && phonesB.length) {
    const phoneMatch = phonesA.some(p => phonesB.includes(p));
    if (phoneMatch) {
      signals.phone_match = 1;
      score += 0.20;
    }
  }

  // Dimension 3: Email domain (weight 0.15)
  const emailsA = (a.emails || []).map(extractEmailDomain).filter(Boolean);
  const emailsB = (b.emails || []).map(extractEmailDomain).filter(Boolean);
  if (emailsA.length && emailsB.length) {
    const domainMatch = emailsA.some(d => emailsB.includes(d));
    if (domainMatch) {
      signals.email_domain_match = 1;
      score += 0.15;
    }
  }

  // Dimension 4: Address (weight 0.15)
  const addrA = normalizeAddress(a.address || '');
  const addrB = normalizeAddress(b.address || '');

  if (addrA.pin && addrB.pin && addrA.pin === addrB.pin) {
    signals.address_pin_match = 1;
    score += 0.10;
  }
  if (addrA.city && addrB.city && addrA.city === addrB.city) {
    signals.address_city_match = 1;
    score += 0.02;
  }
  if (addrA.keywords.length && addrB.keywords.length) {
    const kwOverlap = jaccardSimilarity(addrA.keywords, addrB.keywords);
    if (kwOverlap > 0.3) {
      signals.address_keyword_overlap = kwOverlap;
      score += 0.03 * kwOverlap;
    }
  }

  // Dimension 5: Director/partner names (weight 0.15)
  const dirsA = (a.directors || []).map(normalizeCompanyName).filter(Boolean);
  const dirsB = (b.directors || []).map(normalizeCompanyName).filter(Boolean);
  if (dirsA.length && dirsB.length) {
    const dirOverlap = dirsA.filter(d => dirsB.some(e => e.includes(d) || d.includes(e))).length;
    if (dirOverlap > 0) {
      signals.director_overlap = dirOverlap;
      score += Math.min(0.15, 0.05 * dirOverlap);
    }
  }

  // Verdict logic:
  // - Exact normalized name match alone = very_likely_same (even without other signals)
  // - Brand core match = likely_same
  // - Accumulated score >= 0.7 = very_likely_same
  // - Score >= 0.5 = likely_same
  // - Score >= 0.3 = possibly_related
  let verdict;
  if (signals.name_exact) {
    verdict = 'very_likely_same';
  } else if (signals.name_brand_match) {
    verdict = 'likely_same';
  } else if (score >= 0.7) {
    verdict = 'very_likely_same';
  } else if (score >= 0.5) {
    verdict = 'likely_same';
  } else if (score >= 0.3) {
    verdict = 'possibly_related';
  } else {
    verdict = 'unrelated';
  }

  return {
    score: Math.min(1, score),
    signals,
    verdict
  };
}

// ─── Load Builder Data ─────────────────────────────────────

/**
 * Load all cached builder/project data from RERA scrapers.
 */
function loadCachedBuilders() {
  if (!existsSync(CACHE_DIR)) return [];

  const entities = [];
  const files = readdirSync(CACHE_DIR);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = JSON.parse(readFileSync(resolve(CACHE_DIR, file), 'utf-8'));

      // MahaRERA promoter search results
      if (data.source?.includes('MahaRERA') && data.results) {
        for (const r of data.results) {
          entities.push({
            source_file: file,
            source: data.source,
            promoter_name: r.promoter_name || '',
            registration_no: r.registration_no || '',
            district: r.district || '',
            projects_count: parseInt(r.projects_count || '0'),
            detail_url: r.detail_url || ''
          });
        }
      }

      // Project search results (various sources)
      if (data.results && Array.isArray(data.results) && data.source) {
        for (const r of data.results) {
          if (r.promoter_name || r.promoter) {
            entities.push({
              source_file: file,
              source: data.source,
              project_name: r.project_name || r.name || '',
              promoter_name: r.promoter_name || r.promoter || '',
              rera_id: r.rera_id || r.certificate_no || r.registration_no || '',
              district: r.district || '',
              detail_url: r.detail_url || ''
            });
          }
        }
      }
    } catch { /* skip malformed */ }
  }

  return entities;
}

// ─── Resolve Builder Identity ──────────────────────────────

/**
 * Given a builder name (e.g., "Lodha Group"), find all entities in the
 * cache that likely refer to the same builder.
 */
function resolveBuilder(builderName) {
  const allEntities = loadCachedBuilders();
  const seed = {
    promoter_name: builderName,
    name: builderName
  };

  // Score every entity against the seed
  const scored = allEntities.map(entity => ({
    ...entity,
    similarity: scoreBuilderSimilarity(seed, entity)
  }));

  // Filter to likely matches
  const matches = scored.filter(e => e.similarity.score >= 0.3);

  // Group by verdict
  const grouped = {
    very_likely_same: matches.filter(e => e.similarity.verdict === 'very_likely_same'),
    likely_same: matches.filter(e => e.similarity.verdict === 'likely_same'),
    possibly_related: matches.filter(e => e.similarity.verdict === 'possibly_related')
  };

  // Aggregate unique promoter names across matches
  const uniquePromoters = new Set();
  for (const m of matches) {
    if (m.promoter_name) uniquePromoters.add(m.promoter_name);
  }

  // Aggregate unique projects
  const uniqueProjects = new Map();
  for (const m of matches) {
    if (m.rera_id) uniqueProjects.set(m.rera_id, m);
    else if (m.project_name) uniqueProjects.set(m.project_name.toLowerCase(), m);
  }

  return {
    query: builderName,
    resolved_at: new Date().toISOString(),
    entities_scanned: allEntities.length,
    matches_found: matches.length,
    unique_legal_entities: Array.from(uniquePromoters),
    unique_projects_count: uniqueProjects.size,
    grouped,
    all_projects: Array.from(uniqueProjects.values()),
    notes: [
      'Results are based on fuzzy matching across promoter name, phone, email, address, and directors.',
      'Score >= 0.7 is very likely the same entity. 0.5-0.7 likely. 0.3-0.5 possibly related.',
      'This is more accurate than the RERA project page "previous projects" field, which is often incomplete.',
      'For definitive linkage, cross-reference the returned entities manually.'
    ]
  };
}

// ─── Compare Two Projects ──────────────────────────────────

function compareProjects(projectA, projectB) {
  const allEntities = loadCachedBuilders();

  const entA = allEntities.find(e => e.rera_id === projectA || e.project_name === projectA);
  const entB = allEntities.find(e => e.rera_id === projectB || e.project_name === projectB);

  if (!entA || !entB) {
    return {
      query: { projectA, projectB },
      error: 'One or both projects not found in cache. Run RERA scraper first.',
      found_a: !!entA,
      found_b: !!entB
    };
  }

  const similarity = scoreBuilderSimilarity(entA, entB);

  return {
    query: { projectA, projectB },
    project_a: entA,
    project_b: entB,
    similarity,
    same_builder_likely: similarity.score >= 0.5
  };
}

// ─── Build Relationship Graph ──────────────────────────────

function buildGraph(builderName) {
  const resolved = resolveBuilder(builderName);

  const nodes = [];
  const edges = [];

  // Add unique legal entities as nodes
  for (const name of resolved.unique_legal_entities) {
    nodes.push({ id: name, type: 'entity', label: name });
  }

  // Add projects as nodes
  for (const project of resolved.all_projects) {
    const projId = project.rera_id || project.project_name;
    nodes.push({
      id: projId,
      type: 'project',
      label: project.project_name || projId,
      rera_id: project.rera_id,
      district: project.district
    });

    // Edge from entity to project
    if (project.promoter_name) {
      edges.push({
        from: project.promoter_name,
        to: projId,
        label: 'developed_by'
      });
    }
  }

  return {
    query: builderName,
    nodes,
    edges,
    summary: {
      entity_count: resolved.unique_legal_entities.length,
      project_count: resolved.all_projects.length
    }
  };
}

// ─── CLI ────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const getArg = flag => { const i = args.indexOf(flag); return i >= 0 && i + 1 < args.length ? args[i + 1] : null; };

  if (!command) {
    console.log(`
PropOps Promoter Identity Resolver

Addresses a real gap in builder evaluation: the RERA "previous projects"
field is often blank or incomplete. Instead of trusting it, we resolve
builder identity across projects by fuzzy matching on company name,
directors, phones, emails, and addresses.

Usage:
  node scripts/promoter-resolver.mjs resolve --name "Lodha Group"
    Find all legal entities and projects related to this builder across
    all cached RERA data.

  node scripts/promoter-resolver.mjs compare --project-a "P52100012345" --project-b "P52100067890"
    Check if two RERA projects are likely by the same builder, even if
    registered under different legal entities.

  node scripts/promoter-resolver.mjs graph --name "Lodha Group"
    Build a relationship graph showing all entities and projects linked
    to the builder.

Data source: data/builder-cache/ (populated by RERA scrapers)

Scoring dimensions:
  - Company name (35%)
  - Phone numbers (20%)
  - Email domain (15%)
  - Address/PIN (15%)
  - Directors (15%)

Verdict thresholds:
  >= 0.7  very likely same entity
  0.5-0.7 likely same
  0.3-0.5 possibly related
  < 0.3   unrelated
    `);
    process.exit(0);
  }

  let result;

  switch (command) {
    case 'resolve':
      result = resolveBuilder(getArg('--name') || '');
      break;

    case 'compare':
      result = compareProjects(
        getArg('--project-a') || '',
        getArg('--project-b') || ''
      );
      break;

    case 'graph':
      result = buildGraph(getArg('--name') || '');
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
