// StepOne Career — DOL LCA employer database builder (streaming, memory-safe).
// Downloads the official OFLC public disclosure file (cumulative FY) from dol.gov,
// aggregates employer-level H-1B LCA statistics, and emits a Supabase seed SQL file.
//
// Usage:  node scripts/build-lca-database.mjs
// Output: supabase/h1b_lca_seed.sql + scripts/.cache/lca-summary.json
//
// Why so low-level? The FY2026 Q3 workbook unpacks to a ~1.6GB worksheet with
// 1,032,735 data rows; SheetJS (OOM-prone) and ExcelJS (jszip string-length
// crash, no row events on huge sheets) both fail on it. This parses sheet1.xml
// as a streaming buffer with a tiny regex row-splitter.
import fs from 'node:fs';
import path from 'node:path';
import unzipper from 'unzipper';

const SOURCES = [
  {
    url: 'https://www.dol.gov/media/LCA_Disclosure_Data_FY2026_Q3.xlsx',
    label: 'FY2026 (cumulative through Q3, Oct 1 2025 - Jun 30 2026)'
  }
];

const OUT_SQL_DIR = path.resolve('supabase');
const OUT_DB = 'h1b_lca_employers';
const CACHE = path.resolve('scripts/.cache');

async function downloadIfMissing(src) {
  const fileName = path.basename(new URL(src.url).pathname);
  const local = path.join(CACHE, fileName);
  if (fs.existsSync(local)) {
    console.log(`[cache] ${fileName} already present (${(fs.statSync(local).size / 1e6).toFixed(1)} MB)`);
    return { label: src.label, local, name: fileName };
  }
  fs.mkdirSync(CACHE, { recursive: true });
  console.log(`[download] ${src.url}`);
  const res = await fetch(src.url, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*'
    }
  });
  if (!res.ok) throw new Error(`Download failed ${res.status} ${res.statusText} for ${src.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(local, buf);
  console.log(`[download] saved ${local} (${(buf.length / 1e6).toFixed(1)} MB)`);
  return { label: src.label, local, name: fileName };
}

const unitToYear = (unit) => {
  const u = String(unit || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  if (u.startsWith('year')) return 1;
  if (u.startsWith('month')) return 12;
  if (u.startsWith('biweek')) return 26;
  if (u.startsWith('week')) return 52;
  if (u.startsWith('hour')) return 2080;
  return 0;
};

const normName = (s) =>
  String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .toUpperCase()
    .replace(/[^A-Z0-9&\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// --- minimal streaming xlsx row reader -------------------------------------
// One zip entry is decoded as text streamed in chunks (never fully inflated in
// memory); complete <row>...</row> substrings are emitted across chunk gaps.
async function* entryTextStream(zip, wantedPath) {
  const entry = zip.files.find((f) => f.path === wantedPath);
  if (!entry) throw new Error(`zip entry not found: ${wantedPath}`);
  const chunks = [];
  let leftover = '';
  const stream = entry.stream();
  for await (const chunk of stream) {
    let text = leftover + chunk.toString('utf8');
    // Only complete rows are emitted; keep the tail across chunks.
    while (true) {
      const start = text.indexOf('<row ');
      if (start === -1) break;
      const end = text.indexOf('</row>', start);
      if (end === -1) break;
      yield text.slice(start, end + 6);
      text = text.slice(end + 6);
    }
    leftover = text;
  }
}

const colIndex = (letters) => {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
};

// one <row r="123" ...><c r="A123" t="s">... — returns object keyed by 1-based column index
function parseRowXml(xml) {
  const out = {};
  const re = /<c\s+r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const col = colIndex(m[1]);
    const attrs = m[2] || '';
    const body = m[3] || '';
    if (/t="s"/.test(attrs)) {
      const v = body.match(/<v>([^<]*)<\/v>/);
      out[col] = v ? sharedStrings[Number(v[1])] ?? '' : '';
    } else if (/t="inlineStr"/.test(attrs)) {
      const t = body.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      out[col] = t ? t[1] : '';
    } else {
      const v = body.match(/<v>([^<]*)<\/v>/);
      out[col] = v ? v[1] : '';
    }
  }
  return out;
}

let sharedStrings = [];

// Streams xl/sharedStrings.xml too (it can be hundreds of MB) — never whole-buffer.
// Emits one string per <si>…</si> block, joining <t> pieces inside.
async function loadSharedStrings(zip) {
  const entry = zip.files.find((f) => f.path === 'xl/sharedStrings.xml');
  if (!entry) return;
  sharedStrings = [];
  let leftover = '';
  const finalizeString = (xml) => {
    let s = '';
    const re = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let m;
    while ((m = re.exec(xml)) !== null) s += m[1];
    sharedStrings.push(s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'"));
  };
  for await (const chunk of entry.stream()) {
    leftover += chunk.toString('utf8');
    while (true) {
      const start = leftover.indexOf('<si>');
      if (start === -1) break;
      const end = leftover.indexOf('</si>', start);
      if (end === -1) break;
      finalizeString(leftover.slice(start, end + 5));
      leftover = leftover.slice(end + 5);
    }
    if (leftover.length > 200000) leftover = leftover.slice(leftover.lastIndexOf('<si>')); // trim drift
    if (sharedStrings.length % 200000 === 0 && sharedStrings.length > 0) console.log(`[parse] shared strings ... ${sharedStrings.length.toLocaleString()}`);
  }
  console.log(`[parse] shared strings: ${sharedStrings.length.toLocaleString()}`);
}

async function aggregate(zip, fileRef) {
  console.log(`[parse] ${fileRef.name} ...`);
  await loadSharedStrings(zip);
  const sheetEntry = zip.files.find((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f.path));
  if (!sheetEntry) throw new Error('sheet1.xml not found');

  const agg = new Map();
  let emitted = 0;
  let headers = null;
  let COLS = null;
  let stateCols = [];
  let sawStatus = 0;
  let sawVisa = 0;
  let sawName = 0;
  let certified = 0;
  let h1b = 0;

  for await (const rowXml of entryTextStream(zip, sheetEntry.path)) {
    if (!headers) {
      const row = parseRowXml(rowXml);
      headers = [];
      for (const [k, v] of Object.entries(row)) headers[Number(k)] = String(v).trim();
      if (headers.some((h) => h === 'CASE_STATUS')) {
        COLS = {
          status: headers.findIndex((h) => h === 'CASE_STATUS'),
          visa: headers.findIndex((h) => h === 'VISA_CLASS'),
          employer: headers.findIndex((h) => h === 'EMPLOYER_NAME'),
          workers: headers.findIndex((h) => h === 'TOTAL_WORKER_POSITIONS'),
          wageFrom: headers.findIndex((h) => h === 'WAGE_RATE_OF_PAY_FROM'),
          wageUnit: headers.findIndex((h) => h === 'WAGE_UNIT_OF_PAY')
        };
        stateCols = [];
        headers.forEach((h, i) => {
          if (!h) return;
          if (/STATE/.test(h) && !/SECONDARY/i.test(h)) stateCols.push(i);
        });
        console.log(`[parse] columns detected: status=${COLS.status} employer=${COLS.employer} wage=${COLS.wageFrom} workers=${COLS.workers} states=${stateCols.join(',')}`);
      }
      continue;
    }

    const r = parseRowXml(rowXml);
    sawStatus++;
    const status = COLS.status > 0 ? String(r[COLS.status] ?? '') : '';
    if (status && !/CERTIFIED/i.test(status)) continue;
    certified++;
    const visa = COLS.visa > 0 ? String(r[COLS.visa] ?? '').toUpperCase().trim() : '';
    if (visa !== 'H-1B' && visa !== 'H-1B1' && visa !== 'E-3') continue;
    h1b++;

    const rawName = COLS.employer > 0 ? String(r[COLS.employer] ?? '').trim() : '';
    const key = normName(rawName);
    if (!key || key.length < 3) continue;
    sawName++;

    let e = agg.get(key);
    if (!e) {
      e = { key, name: rawName, filings: 0, workers: 0, wages: [], states: new Map(), sourcesSet: new Set() };
      agg.set(key, e);
    }
    if (rawName.length > e.name.length) e.name = rawName;

    const workersNum = Number(r[COLS.workers]) || 1;
    e.filings += 1;
    e.workers += workersNum;

    const wage = Number(r[COLS.wageFrom]) || 0;
    const mult = unitToYear(r[COLS.wageUnit]);
    if (wage > 0 && mult > 0) e.wages.push(wage * mult);

    for (const c of stateCols) {
      const v = String(r[c] ?? '').trim().toUpperCase();
      if (USPS_STATES.has(v)) e.states.set(v, (e.states.get(v) || 0) + 1);
    }
    e.sourcesSet.add(fileRef.label);

    emitted++;
    if (emitted % 100000 === 0) console.log(`[parse] ... ${emitted.toLocaleString()} data rows, employers ${agg.size.toLocaleString()}`);
  }

  console.log(`[stats] considered=${sawStatus.toLocaleString()} certified=${certified.toLocaleString()} h1b=${h1b.toLocaleString()} matchedEmployers=${sawName.toLocaleString()}`);
  console.log(`[agg] unique employers in ${fileRef.name}: ${agg.size.toLocaleString()}`);
  return { agg, fileRef };
}

function mergeAll(aggs) {
  const merged = new Map();
  for (const { agg, fileRef } of aggs) {
    for (const [key, e] of agg) {
      let t = merged.get(key);
      if (!t) {
        t = { key, name: e.name, filings: 0, workers: 0, wages: [], states: new Map(), sources: new Map() };
        merged.set(key, t);
      }
      if (e.name.length > t.name.length) t.name = e.name;
      t.filings += e.filings;
      t.workers += e.workers;
      t.wages.push(...e.wages);
      for (const [st, c] of e.states) t.states.set(st, (t.states.get(st) || 0) + c);
      t.sources.set(fileRef.label, e.filings);
    }
  }
  return merged;
}

const USPS_STATES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','VI','GU','MP','AS']);

const esc = (s) => String(s).replace(/'/g, "''");

function topStates(states, n = 3) {
  return [...states.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([s]) => s).join(', ');
}

async function main() {
  const zipRefs = [];
  for (const src of SOURCES) {
    const ref = await downloadIfMissing(src);
    const zip = await (unzipper.Open).file(ref.local);
    zipRefs.push({ zip, ref });
  }

  const aggs = [];
  for (const { zip, ref } of zipRefs) {
    aggs.push(await aggregate(zip, ref));
  }
  const merged = mergeAll(aggs);

  const rows = [...merged.values()].map((e) => {
    const med = median(e.wages);
    return {
      employerName: e.name,
      filings: e.filings,
      positions: e.workers,
      medianWage: med ? Math.round(med) : null,
      topStates: topStates(e.states),
      sources: [...e.sources.keys()].join('; ')
    };
  });

  rows.sort((a, b) => b.filings - a.filings);
  console.log(`[merge] unique employers across sources: ${rows.length.toLocaleString()}`);

  fs.mkdirSync(OUT_SQL_DIR, { recursive: true });
  const sqlPath = path.join(OUT_SQL_DIR, 'h1b_lca_seed.sql');
  const stmts = [];
  stmts.push(`-- StepOne Career — Supabase seed: employer-level H-1B LCA statistics.`);
  stmts.push(`-- Source: official OFLC public disclosure data, ${SOURCES.map((s) => s.label).join(' + ')}.`);
  stmts.push(`-- Generated by scripts/build-lca-database.mjs on ${new Date().toISOString()}`);
  stmts.push(`create table if not exists ${OUT_DB} (
  employer_name text primary key,
  filings integer not null,
  positions bigint,
  median_wage numeric,
  top_states text,
  sources text
);`);
  stmts.push(`alter table ${OUT_DB} enable row level security;`);
  stmts.push(`drop policy if exists "public read ${OUT_DB}" on ${OUT_DB};`);
  stmts.push(`create policy "public read ${OUT_DB}" on ${OUT_DB} for select using (true);`);
  stmts.push(`-- rows included: ${rows.length.toLocaleString()}`);
  for (let i = 0; i < rows.length; i += 250) {
    const slice = rows.slice(i, i + 250);
    const values = slice
      .map((r) => `('${esc(r.employerName)}', ${r.filings}, ${r.positions ?? 0}, ${r.medianWage ?? 'null'}, '${esc(r.topStates)}', '${esc(r.sources)}')`)
      .join(',\n');
    stmts.push(`insert into ${OUT_DB} (employer_name, filings, positions, median_wage, top_states, sources) values\n${values}\non conflict (employer_name) do nothing;`);
  }
  fs.writeFileSync(sqlPath, stmts.join('\n\n'), 'utf8');
  fs.writeFileSync(path.join(CACHE, 'lca-summary.json'), JSON.stringify({ totalEmployers: rows.length, top: rows.slice(0, 20), generatedAt: new Date().toISOString() }, null, 2), 'utf8');
  console.log(`[done] wrote ${sqlPath} with ${rows.length.toLocaleString()} employer rows`);
  console.log(`[preview] top 5:`);
  for (const r of rows.slice(0, 5)) {
    console.log(`  ${r.employerName} — filings ${r.filings}, positions ${r.positions}, median $${r.medianWage}, states ${r.topStates}`);
  }
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
