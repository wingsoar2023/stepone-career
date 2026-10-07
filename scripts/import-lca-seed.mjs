// Executes supabase/h1b_lca_seed.sql against the project database.
// Connection string is read from scripts/.db-url (never logged).
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const url = fs.readFileSync(path.resolve('scripts/.db-url'), 'utf8').trim();
const sql = fs.readFileSync(path.resolve('supabase/h1b_lca_seed.sql'), 'utf8');

// The saved line keeps the real password inside brackets: ...postgres:[pass]@host...
const raw = url;
const m = raw.match(/^postgresql:\/\/postgres:\[(.*?)\]@/);
if (!m) throw new Error('db-url format: expect postgresql://postgres:[password]@host/port/db');
const password = encodeURIComponent(m[1]);
const ref = 'stbxqprhssgnqdmajdkd';
// Supabase direct-connection host no longer resolves; use the regional pooler.
const connStr = `postgresql://postgres.${ref}:${password}@aws-0-us-west-2.pooler.supabase.com:6543/postgres`;
const client = new pg.Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('[connect] ok');

  // Count statements to execute individually for resumable feedback.
  const stmts = sql.split(/\n\n(?=insert into |create |alter |drop policy )/);
  console.log(`[sql] ${stmts.length} statements, ${(sql.length / 1e6).toFixed(2)} MB`);

  for (let i = 0; i < stmts.length; i++) {
    const s = stmts[i].trim();
    if (!s) continue;
    const tag = s.startsWith('insert') ? `insert chunk ${i}` : s.slice(0, 40);
    await client.query(s);
    if (s.startsWith('insert') && i % 20 === 0) console.log(`[sql] ... ${tag} done`);
  }

  const { rows } = await client.query('select count(*)::int as n from h1b_lca_employers');
  console.log(`[verify] table h1b_lca_employers rows = ${rows[0].n.toLocaleString()}`);
  const top = await client.query('select employer_name, filings, median_wage from h1b_lca_employers order by filings desc limit 3');
  for (const r of top.rows) console.log(`[verify] top: ${r.employer_name} — ${r.filings} filings, median $${r.median_wage}`);
  await client.end();
}

run().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
