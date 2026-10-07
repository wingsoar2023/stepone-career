// Real US DOL LCA employer lookup backed by Supabase (table h1b_lca_employers,
// seeded by scripts/build-lca-database.mjs from official OFLC disclosure data).
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Mirrors the normalization in scripts/build-lca-database.mjs.
const normName = (s) =>
  String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .toUpperCase()
    .replace(/[^A-Z0-9&\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const LCA_DATA_SOURCE = 'FY2026 OFLC public disclosure file (certified LCAs, Oct 1 2025 - Jun 30 2026)';

export const classifySponsorship = (filings) =>
  filings >= 800 ? 'Heavy H-1B sponsor'
    : filings >= 100 ? 'Frequent H-1B sponsor'
      : filings >= 20 ? 'Moderate H-1B sponsor'
        : 'Some recorded H-1B sponsorship';

export async function searchLcaEmployers(query, limit = 6) {
  if (!isSupabaseConfigured || !supabase) return [];
  const q = normName(query);
  if (q.length < 3) return [];
  const { data, error } = await supabase
    .from('h1b_lca_employers')
    .select('employer_name, filings, positions, median_wage, top_states, sources')
    .ilike('employer_name', `${q.replace(/%|_/g, ' ')}%`)
    .order('filings', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('LCA search failed:', error.message);
    return [];
  }
  return data || [];
}

const fmtWage = (n) => (n == null ? 'Not available' : `$${Number(n).toLocaleString()}`);

export function lcaRowToCompanyInfo(row) {
  if (!row) return null;
  const firstSource = String(row.sources || '').split(';')[0];
  return {
    generic: true, // still not a brand-dictionary entry, but backfilled with real data
    name: row.employer_name,
    sponsorshipStatus: classifySponsorship(row.filings || 0),
    filingVolume: `${(row.filings || 0).toLocaleString()} certified LCA filings (${firstSource || LCA_DATA_SOURCE})`,
    typicalSalary: fmtWage(row.median_wage),
    optStemAccepted: true,
    greenCardPolicy: 'Varies by company size and policy',
    insights: `US DOL LCA public disclosure shows ${(row.filings || 0).toLocaleString()} certified filings with median annual base wage ${fmtWage(row.median_wage)}. Top filing locations: ${row.top_states || 'n/a'}. Always confirm with the employer.`,
    fromLcaDatabase: true
  };
}
