#!/usr/bin/env node

/**
 * PropOps State Registry
 *
 * Central registry of Indian state property portals. Each state has:
 * - IGRS/registration portal (for actual sale prices)
 * - RERA portal (for builder and project data)
 * - Optional: dedicated API or alternative sources
 *
 * This module defines the state-by-state configuration that scrapers use.
 * When adding a new state, add an entry here with the portal details and
 * update the appropriate scraper to use this config.
 */

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
      scraper: 'igrs-maharashtra.mjs',
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
      scraper: 'maharera-scraper.mjs',
      search_params: ['project_name', 'promoter_name', 'certificate_no', 'district', 'pincode']
    }
  },

  karnataka: {
    code: 'KA',
    name: 'Karnataka',
    major_cities: ['Bangalore', 'Mysore', 'Mangalore', 'Hubli'],

    igrs: {
      enabled: false, // To be enabled when scraper is built
      primary_url: 'https://kaverionline.karnataka.gov.in/',
      alt_url: 'https://igr.karnataka.gov.in/',
      tech: 'Custom Java web app',
      has_captcha: true,
      captcha_type: 'image',
      data_from: 2005,
      coverage: 'All Karnataka districts',
      scraper: 'kaveri-karnataka.mjs', // TODO
      search_params: ['district', 'taluka', 'village', 'sro_office', 'year'],
      notes: 'Kaveri is the Karnataka online property registration portal. Search by SRO office required.'
    },

    rera: {
      enabled: false, // To be enabled when scraper is built
      primary_url: 'https://rera.karnataka.gov.in/',
      project_search: 'https://rera.karnataka.gov.in/projectViewDetails',
      promoter_search: 'https://rera.karnataka.gov.in/promoterViewDetails',
      tech: 'Custom',
      has_captcha: false,
      scraper: 'krera-karnataka.mjs', // TODO
      search_params: ['project_name', 'promoter_name', 'rera_number', 'district'],
      notes: 'K-RERA. Bangalore has the largest project count.'
    }
  },

  telangana: {
    code: 'TG',
    name: 'Telangana',
    major_cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],

    igrs: {
      enabled: false, // To be enabled
      primary_url: 'https://registration.telangana.gov.in/',
      alt_url: 'https://igrs.telangana.gov.in/',
      tech: 'Custom',
      has_captcha: true,
      data_from: 1983,
      coverage: 'All 33 Telangana districts',
      scraper: 'igrs-telangana.mjs', // TODO
      search_params: ['district', 'mandal', 'village', 'year'],
      notes: 'Well-maintained digital portal. 1983+ records digitized.'
    },

    rera: {
      enabled: false, // To be enabled
      primary_url: 'https://rera.telangana.gov.in/',
      project_search: 'https://rera.telangana.gov.in/ProjectDetails',
      tech: 'Custom',
      has_captcha: false,
      scraper: 'tsrera.mjs', // TODO
      notes: 'TS-RERA. Hyderabad has strong real estate market.'
    }
  },

  tamil_nadu: {
    code: 'TN',
    name: 'Tamil Nadu',
    major_cities: ['Chennai', 'Coimbatore', 'Madurai', 'Trichy'],

    igrs: {
      enabled: false, // To be enabled
      primary_url: 'https://tnreginet.gov.in/',
      tech: 'Custom',
      has_captcha: true,
      data_from: 2001,
      coverage: 'All Tamil Nadu districts',
      scraper: 'tnreginet.mjs', // TODO
      search_params: ['district', 'sro', 'year', 'document_type'],
      notes: 'TNREGINET is the Tamil Nadu registration portal.'
    },

    rera: {
      enabled: false,
      primary_url: 'https://rera.tn.gov.in/',
      project_search: 'https://rera.tn.gov.in/projectViewDetails',
      tech: 'Custom',
      has_captcha: false,
      scraper: 'tnrera.mjs', // TODO
      notes: 'TN-RERA. Chennai is primary market.'
    }
  },

  delhi: {
    code: 'DL',
    name: 'Delhi',
    major_cities: ['Delhi', 'New Delhi'],

    igrs: {
      enabled: false, // To be enabled
      primary_url: 'https://doris.delhigovt.nic.in/',
      tech: 'Custom',
      has_captcha: true,
      data_from: 2002,
      scraper: 'doris-delhi.mjs', // TODO
      search_params: ['district', 'sro', 'year'],
      notes: 'DORIS - Delhi Online Registration Information System'
    },

    rera: {
      enabled: false,
      primary_url: 'https://rera.delhi.gov.in/',
      tech: 'Custom',
      scraper: 'delhi-rera.mjs', // TODO
      notes: 'Delhi RERA covers NCT of Delhi.'
    }
  },

  uttar_pradesh: {
    code: 'UP',
    name: 'Uttar Pradesh',
    major_cities: ['Noida', 'Greater Noida', 'Ghaziabad', 'Lucknow', 'Kanpur', 'Agra'],
    note: 'Covers Noida/Greater Noida (key NCR markets)',

    igrs: {
      enabled: false,
      primary_url: 'https://igrsup.gov.in/',
      tech: 'ASP.NET',
      has_captcha: true,
      data_from: 2002,
      scraper: 'igrsup.mjs', // TODO
      search_params: ['district', 'tehsil', 'village', 'year'],
      notes: 'IGRSUP portal. Important for Noida/Greater Noida NCR market.'
    },

    rera: {
      enabled: false,
      primary_url: 'https://www.up-rera.in/',
      project_search: 'https://www.up-rera.in/projects',
      tech: 'Custom',
      scraper: 'uprera.mjs', // TODO
      notes: 'UP-RERA. Covers Noida/Greater Noida (biggest NCR market).'
    }
  },

  haryana: {
    code: 'HR',
    name: 'Haryana',
    major_cities: ['Gurgaon', 'Faridabad', 'Panchkula', 'Hisar'],
    note: 'Covers Gurgaon (key NCR market)',

    igrs: {
      enabled: false,
      primary_url: 'https://jamabandi.nic.in/',
      tech: 'Custom',
      has_captcha: true,
      scraper: 'jamabandi-haryana.mjs', // TODO
      notes: 'Jamabandi portal for Haryana land records.'
    },

    rera: {
      enabled: false,
      primary_url: 'https://haryanarera.gov.in/',
      tech: 'Custom',
      scraper: 'haryana-rera.mjs', // TODO
      notes: 'Haryana RERA. Covers Gurgaon (major real estate hub).'
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

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'list') {
    console.log(JSON.stringify(listStates(), null, 2));
  } else if (command === 'get' && process.argv[3]) {
    console.log(JSON.stringify(getState(process.argv[3]), null, 2));
  } else if (command === 'cities') {
    console.log(JSON.stringify(getAllCities(), null, 2));
  } else {
    console.log(`
PropOps State Registry

Usage:
  node scripts/scrapers/state-registry.mjs list           # List all states and support status
  node scripts/scrapers/state-registry.mjs get <state>    # Get config for a state (name, code, or city)
  node scripts/scrapers/state-registry.mjs cities         # List all cities with their state

Examples:
  node scripts/scrapers/state-registry.mjs get Maharashtra
  node scripts/scrapers/state-registry.mjs get KA
  node scripts/scrapers/state-registry.mjs get Bangalore
    `);
  }
}
