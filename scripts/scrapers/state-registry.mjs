#!/usr/bin/env node

/**
 * PropOps State Registry
 *
 * Central registry of Indian state property portals. Each state has:
 * - IGRS/registration portal (for actual sale prices)
 * - RERA portal (for builder and project data)
 * - Optional: dedicated API or alternative sources
 *
 * GAME-CHANGING FINDING (research 2026-04-10):
 *
 * 1. NATIONAL UNIFIED RERA PORTAL exists at https://www.rera.mohua.gov.in/
 *    Launched September 2025 by MoHUA. Covers 151,113+ projects from
 *    ALL 35 states/UTs in one place. Use this as the PRIMARY RERA data
 *    source before falling back to state-specific portals.
 *
 * 2. NGDRS (National Generic Document Registration System) is the
 *    standardized IGRS replacement across 18+ states. A single NGDRS
 *    scraper is reusable across Assam, Delhi, Punjab, J&K, and more.
 *    This is a huge engineering leverage point.
 *
 * 3. Landeed (YC-backed) is commercially scraping these portals and
 *    reselling the data — validates the legal approach.
 */

export const NATIONAL_SOURCES = {
  rera_unified: {
    name: 'Unified RERA Portal (MoHUA)',
    url: 'https://www.rera.mohua.gov.in/',
    operator: 'Ministry of Housing and Urban Affairs',
    launched: '2025-09-04',
    coverage: '35 states/UTs, 151,113+ projects, 106,545+ agents',
    type: 'RERA aggregator',
    difficulty: 'UNKNOWN (needs testing for JSON API)',
    scraper: 'rera-national.mjs',
    notes: 'PRIMARY source for RERA data. Collapses 35 state portals to 1. Check network tab for JSON backend.'
  },

  ngdrs: {
    name: 'NGDRS (National Generic Document Registration System)',
    operator: 'NIC / Department of Land Resources',
    type: 'Standardized IGRS replacement',
    states_using: ['delhi', 'assam', 'punjab', 'jammu_kashmir', 'ladakh', 'manipur', 'nagaland', 'tripura', 'mizoram', 'meghalaya', 'arunachal', 'sikkim', 'goa', 'dadra_nagar_haveli', 'daman_diu', 'puducherry', 'chandigarh', 'lakshadweep'],
    delhi_url: 'https://ngdrs.delhi.gov.in/',
    info_url: 'https://dolr.gov.in/national-generic-document-registration-system/',
    difficulty: 'MEDIUM',
    scraper: 'ngdrs-scraper.mjs',
    notes: '18+ states standardized on this. One scraper = 18 states. Huge leverage.'
  },

  landeed: {
    name: 'Landeed (Commercial API)',
    url: 'https://web.landeed.com/',
    type: 'Commercial relay of state portals',
    note: 'YC-backed startup. Covers Karnataka, Telangana, Tamil Nadu EC data. Paid but saves massive engineering. Validates legal approach.'
  }
};

export const STATES = {
  maharashtra: {
    code: 'MH',
    name: 'Maharashtra',
    major_cities: ['Mumbai', 'Pune', 'Thane', 'Navi Mumbai', 'Nashik', 'Aurangabad', 'Nagpur'],

    igrs: {
      enabled: true,
      primary_url: 'https://freesearchigrservice.maharashtra.gov.in/',
      alt_url: 'https://esearchigrservice.maharashtra.gov.in/',
      tech: 'ASP.NET',
      has_captcha: true,
      captcha_type: 'image',
      data_from: 1985,
      coverage: 'Mumbai from 1985, other districts from 2002',
      difficulty: 'MEDIUM',
      scraper: 'igrs-scraper.mjs',
      search_params: ['district', 'village', 'year', 'property_number'],
      districts: {
        mumbai_city: 'मुंबई जिल्हा',
        mumbai_suburban: 'मुंबई उपनगर जिल्हा',
        pune: 'पुणे',
        thane: 'ठाणे',
        nashik: 'नाशिक',
        aurangabad: 'औरंगाबाद',
        nagpur: 'नागपूर'
      }
    },

    rera: {
      enabled: true,
      primary_url: 'https://maharera.maharashtra.gov.in/',
      alt_url: 'https://maharerait.mahaonline.gov.in/',
      project_search: 'https://maharera.maharashtra.gov.in/projects-search-result',
      promoter_search: 'https://maharera.maharashtra.gov.in/promoters-search-result',
      tech: 'Drupal (primary) + ASP.NET (alt)',
      has_captcha: false,
      difficulty: 'LOW-MEDIUM',
      scraper: 'maharera-scraper.mjs',
      search_params: ['project_name', 'promoter_name', 'certificate_no', 'district', 'pincode']
    }
  },

  karnataka: {
    code: 'KA',
    name: 'Karnataka',
    major_cities: ['Bangalore', 'Mysore', 'Mangalore', 'Hubli'],

    igrs: {
      enabled: true,
      primary_url: 'https://kaveri.karnataka.gov.in/',
      name: 'Kaveri Online Services 2.0',
      operator: 'Department of Stamps & Registration (built with C-DAC)',
      tech: 'JSP/.NET hybrid, session-heavy',
      has_captcha: true,
      captcha_type: 'image',
      requires_login: true,
      login_method: 'Mobile + OTP (human-in-the-loop session handoff)',
      difficulty: 'HIGH',
      scraper: 'kaveri-karnataka.mjs',
      session_file: 'data/kaveri-session.json',
      session_validity_hours: 8,
      search_params: ['district', 'taluk', 'hobli', 'village', 'survey_number', 'registration_number', 'party_name', 'document_type', 'date_range'],
      features: ['EC search', 'Market value (guidance value)', 'Deed details'],
      notes: 'HARD. User logs in manually once, session cookies saved for 8 hours. Aggressive caching (7 days) minimizes re-login friction.',
      alt_approach: {
        zen_citizen: 'https://zencitizen.in/2024/11/07/kaveri-village-finder/',
        landeed: 'https://web.landeed.com/karnataka/ec-encumbrance-certificate'
      }
    },

    rera: {
      enabled: true,
      primary_url: 'https://rera.karnataka.gov.in/home?language=en',
      project_listing: 'https://rera.karnataka.gov.in/viewAllProjects?language=en',
      tech: 'NIC-style Java/JSP, server-rendered paginated tables',
      has_captcha: false,
      difficulty: 'LOW',
      scraper: 'krera-karnataka.mjs',
      search_params: ['project_name', 'application_number', 'district', 'taluk', 'promoter_name', 'registration_number'],
      notes: 'Public HTML tables, no auth needed. Covers Bangalore real estate market.'
    }
  },

  telangana: {
    code: 'TG',
    name: 'Telangana',
    major_cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],

    igrs: {
      enabled: false,
      primary_url: 'https://registration.telangana.gov.in/',
      alt_url: 'https://prereg.telangana.gov.in/',
      tech: 'Classic ASP/JSP NIC stack',
      has_captcha: true,
      captcha_type: 'image',
      data_from: 1983,
      coverage: 'All 33 Telangana districts, digitized from 1983',
      difficulty: 'MEDIUM-HIGH',
      scraper: 'igrs-telangana.mjs',
      search_params: ['district', 'mandal', 'village', 'survey_no', 'plot_no', 'sro', 'year', 'document_number'],
      features: ['EC search', 'Market value search (land vs apartment)', 'Deed details'],
      notes: 'One of the most comprehensive historical datasets (1983+). Public-facing search doesnt always require login. Landeed covers it commercially.'
    },

    rera: {
      enabled: false,
      primary_url: 'https://rera.telangana.gov.in/',
      search_url: 'https://rerait.telangana.gov.in/SearchList/Search',
      tech: 'ASP.NET MVC',
      has_captcha: false,
      captcha_on: 'login only, not search',
      difficulty: 'LOW-MEDIUM',
      scraper: 'tsrera.mjs',
      search_params: ['project_name', 'promoter_name', 'registration_number'],
      features: ['Project search', 'Agent registration search', 'Quarterly progress reports'],
      notes: 'Public search works without login. ASP.NET ViewState handling needed.'
    }
  },

  tamil_nadu: {
    code: 'TN',
    name: 'Tamil Nadu',
    major_cities: ['Chennai', 'Coimbatore', 'Madurai', 'Trichy'],

    igrs: {
      enabled: false,
      primary_url: 'https://tnreginet.gov.in/',
      name: 'TNREGINET',
      operator: 'Inspector General of Registration, TN Revenue Department',
      tech: 'Java/ASP.NET hybrid, session-based',
      has_captcha: true,
      captcha_type: 'image',
      data_from: 1995,
      coverage: 'EC search up to 30 years back',
      difficulty: 'MEDIUM',
      scraper: 'tnreginet.mjs',
      search_params: ['zone', 'district', 'sro', 'village', 'survey_no', 'plot_no', 'date_range', 'party_name'],
      features: ['EC search (30-year history)', 'Guideline value search', 'Document status', 'PDF exports'],
      notes: 'One of the better-structured portals. Landeed supports it commercially.'
    },

    rera: {
      enabled: true,
      primary_url: 'https://rera.tn.gov.in/',
      cms_url: 'https://www.rera.tn.gov.in/cms/',
      annual_listings_pattern: 'https://www.rera.tn.gov.in/cms/reg_projects_tamilnadu/Building/{year}.php',
      tech: 'PHP, NIC-developed CMS',
      has_captcha: false,
      difficulty: 'LOW',
      scraper: 'tnrera.mjs',
      search_params: ['year', 'project_name', 'promoter_name', 'district', 'registration_number'],
      data_from: 2017,
      notes: 'Easiest RERA portal. Static PHP pages organized by year. Direct URL scraping works.'
    }
  },

  delhi: {
    code: 'DL',
    name: 'Delhi',
    major_cities: ['Delhi', 'New Delhi'],

    igrs: {
      enabled: false,
      legacy_url: 'https://doris.delhigovt.nic.in/',
      esearch_url: 'https://esearch.delhigovt.nic.in/',
      current_url: 'https://ngdrs.delhi.gov.in/',
      name: 'DORIS (legacy) → NGDRS (current)',
      migration: 'All Delhi SROs migrated from DORIS to NGDRS in early 2025',
      tech_legacy: 'ASP.NET WebForms (.aspx)',
      tech_current: 'NGDRS - Java-based, NIC',
      has_captcha: true,
      captcha_type: 'image',
      difficulty: 'MEDIUM',
      scraper: 'ngdrs-scraper.mjs',
      notes: 'DORIS still has historical records (pre-2024). NGDRS has 231K+ new registrations. Build NGDRS scraper — REUSABLE across 18 states.',
      reusable_across_states: 18
    },

    rera: {
      enabled: false,
      primary_url: 'https://rera.delhi.gov.in/',
      difficulty: 'MEDIUM',
      scraper: 'delhi-rera.mjs',
      notes: 'Use unified MoHUA portal as primary source. State portal as fallback.'
    }
  },

  uttar_pradesh: {
    code: 'UP',
    name: 'Uttar Pradesh',
    major_cities: ['Noida', 'Greater Noida', 'Ghaziabad', 'Lucknow', 'Kanpur', 'Agra'],
    ncr_coverage: ['Noida', 'Greater Noida', 'Ghaziabad'],
    note: 'Covers the largest NCR market (Noida/Greater Noida)',

    igrs: {
      enabled: false,
      primary_url: 'https://igrsup.gov.in/',
      tech: 'ASP.NET / Java hybrid, NIC',
      has_captcha: true,
      data_from: 2002,
      difficulty: 'MEDIUM-HIGH',
      scraper: 'igrsup.mjs',
      search_params: ['district', 'tehsil', 'village', 'registration_number'],
      notes: 'IGRSUP covers UP statewide. Noida/Greater Noida are biggest NCR markets.'
    },

    rera: {
      enabled: false,
      primary_url: 'https://www.up-rera.in/',
      legacy_url: 'https://uprera.azurewebsites.net/View_projects.aspx',
      tech: 'ASP.NET WebForms on Azure',
      has_captcha: false,
      difficulty: 'LOW-MEDIUM',
      scraper: 'uprera.mjs',
      search_params: ['project_name', 'promoter_name', 'district', 'registration_number'],
      notes: 'Noida alone has 69 projects / 37,199 units. Legacy portal still works. ASP.NET ViewState handling needed via Scrapy FormRequest pattern.'
    }
  },

  haryana: {
    code: 'HR',
    name: 'Haryana',
    major_cities: ['Gurgaon', 'Faridabad', 'Panchkula', 'Hisar'],
    note: 'Gurgaon is the key NCR real estate market',

    igrs: {
      enabled: false,
      primary_url: 'https://jamabandi.nic.in/',
      tech: 'NIC hosted',
      has_captcha: true,
      difficulty: 'MEDIUM-HIGH',
      scraper: 'jamabandi-haryana.mjs',
      notes: 'Haryana has less-centralized online deed search than others. Regional offices vary.'
    },

    rera: {
      enabled: false,
      panchkula_url: 'https://haryanarera.gov.in/',
      gurugram_url: 'https://hareraggm.gov.in/',
      jurisdictions: {
        panchkula: 'North Haryana',
        gurugram: 'Gurugram + Faridabad + South Haryana (KEY NCR MARKET)'
      },
      tech: 'PHP, NIC-developed',
      has_captcha: true,
      difficulty: 'MEDIUM',
      scrapers: ['harera-panchkula.mjs', 'harera-gurugram.mjs'],
      notes: 'TWO SEPARATE authorities. Gurugram has its own portal and database. Both must be scraped. Gurgaon market is mostly on hareraggm.gov.in.'
    }
  }
};

/**
 * Get state config by name or code (case insensitive)
 */
export function getState(identifier) {
  if (!identifier) return null;
  const lower = identifier.toLowerCase().replace(/\s+/g, '_');

  // Direct key match
  if (STATES[lower]) return STATES[lower];

  // Code match
  const byCode = Object.values(STATES).find(s => s.code.toLowerCase() === lower);
  if (byCode) return byCode;

  // Name match
  const byName = Object.values(STATES).find(s => s.name.toLowerCase() === identifier.toLowerCase());
  if (byName) return byName;

  // City match (find the state the city belongs to)
  const byCity = Object.values(STATES).find(s =>
    s.major_cities.some(c => c.toLowerCase() === identifier.toLowerCase())
  );
  if (byCity) return byCity;

  return null;
}

/**
 * List all states with their support status
 */
export function listStates() {
  return Object.entries(STATES).map(([key, state]) => ({
    key,
    code: state.code,
    name: state.name,
    cities: state.major_cities,
    igrs_supported: state.igrs?.enabled || false,
    rera_supported: state.rera?.enabled || false,
    igrs_difficulty: state.igrs?.difficulty || 'UNKNOWN',
    rera_difficulty: state.rera?.difficulty || 'UNKNOWN',
    status: (state.igrs?.enabled && state.rera?.enabled) ? 'Full support' :
            (state.igrs?.enabled || state.rera?.enabled) ? 'Partial support' : 'Planned'
  }));
}

/**
 * Get cities across all states for autocomplete
 */
export function getAllCities() {
  return Object.values(STATES).flatMap(s =>
    s.major_cities.map(city => ({ city, state: s.name, code: s.code }))
  );
}

/**
 * Get build priority recommendations based on difficulty and impact
 */
export function getBuildPriority() {
  return [
    {
      priority: 1,
      name: 'Unified RERA Portal (MoHUA)',
      url: NATIONAL_SOURCES.rera_unified.url,
      impact: 'Covers 35 states in one scraper. Biggest leverage move.',
      difficulty: 'UNKNOWN - needs investigation',
      scraper: 'rera-national.mjs'
    },
    {
      priority: 2,
      name: 'TNRERA (Tamil Nadu)',
      url: STATES.tamil_nadu.rera.primary_url,
      impact: 'Chennai market. Easiest scraper to build - validates pipeline.',
      difficulty: 'LOW',
      scraper: 'tnrera.mjs'
    },
    {
      priority: 3,
      name: 'K-RERA (Karnataka)',
      url: STATES.karnataka.rera.primary_url,
      impact: 'Bangalore market. LOW difficulty, public HTML tables.',
      difficulty: 'LOW',
      scraper: 'krera-karnataka.mjs'
    },
    {
      priority: 4,
      name: 'NGDRS (Delhi → 18 states)',
      url: STATES.delhi.igrs.current_url,
      impact: 'One scraper works for 18 states via NGDRS standard.',
      difficulty: 'MEDIUM',
      scraper: 'ngdrs-scraper.mjs'
    },
    {
      priority: 5,
      name: 'TG-RERA (Telangana)',
      url: STATES.telangana.rera.primary_url,
      impact: 'Hyderabad market. ASP.NET but public search.',
      difficulty: 'LOW-MEDIUM',
      scraper: 'tsrera.mjs'
    },
    {
      priority: 6,
      name: 'UP RERA (Noida/Greater Noida)',
      url: STATES.uttar_pradesh.rera.primary_url,
      impact: 'Biggest NCR real estate market.',
      difficulty: 'LOW-MEDIUM',
      scraper: 'uprera.mjs'
    }
  ];
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'list') {
    console.log(JSON.stringify(listStates(), null, 2));
  } else if (command === 'get' && process.argv[3]) {
    console.log(JSON.stringify(getState(process.argv[3]), null, 2));
  } else if (command === 'cities') {
    console.log(JSON.stringify(getAllCities(), null, 2));
  } else if (command === 'national') {
    console.log(JSON.stringify(NATIONAL_SOURCES, null, 2));
  } else if (command === 'priority') {
    console.log(JSON.stringify(getBuildPriority(), null, 2));
  } else {
    console.log(`
PropOps State Registry

Usage:
  node scripts/scrapers/state-registry.mjs list          # List all states and support status
  node scripts/scrapers/state-registry.mjs get <state>   # Get config for a state (name, code, or city)
  node scripts/scrapers/state-registry.mjs cities        # List all cities with their state
  node scripts/scrapers/state-registry.mjs national      # National-level sources (MoHUA unified RERA, NGDRS)
  node scripts/scrapers/state-registry.mjs priority      # Build priority recommendations

Examples:
  node scripts/scrapers/state-registry.mjs get Maharashtra
  node scripts/scrapers/state-registry.mjs get KA
  node scripts/scrapers/state-registry.mjs get Bangalore
    `);
  }
}
