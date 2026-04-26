import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const testCases = [
    { name: 'Reparos elétricos (service)', service: 'Reparos elétricos', q: null },
    { name: 'Instalações Hidráulicas (service)', service: 'Instalações Hidráulicas', q: null },
    { name: 'Pinturas (service)', service: 'Pinturas', q: null },
    { name: 'Diaristas (service)', service: 'Diaristas', q: null },
    { name: 'pedreiro (q)', service: null, q: 'pedreiro' },
    { name: 'eletrica (q)', service: null, q: 'eletrica' },
    { name: 'elétrica (q)', service: null, q: 'elétrica' },
    { name: 'Eletricista (q)', service: null, q: 'Eletricista' },
  ];

  for (const t of testCases) {
    let mappedService = t.service;
    if (t.service) {
      const normalize = (str: string) =>
        str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const s = normalize(t.service);
      if (s.includes('eletric')) mappedService = 'eletric';
      else if (s.includes('hidraul') || s.includes('encanador')) mappedService = 'encanad';
      else if (s.includes('pintur') || s.includes('pintor')) mappedService = 'pint';
      else if (s.includes('diarista')) mappedService = 'diarista';
      else if (s.includes('pedreiro')) mappedService = 'pedreir';
      else if (s.includes('marceneir')) mappedService = 'marceneir';
    }

    const queryTerm = t.q ? t.q : null;

    const result = await pool.query(`
      SELECT p.id, p.specialty, pr.full_name
      FROM professionals_public p
      JOIN profiles pr ON pr.id = p.profile_id
      WHERE 
         ($1::text IS NULL OR pr.full_name ILIKE '%' || $1 || '%' OR p.bio ILIKE '%' || $1 || '%' OR p.specialty ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR p.specialty ILIKE '%' || $2 || '%' OR p.bio ILIKE '%' || $2 || '%')
    `, [queryTerm, mappedService]);

    console.log(`Test: ${t.name} -> matches: ${result.rows.length}`);
    for (const r of result.rows) {
      console.log(`  - ${r.full_name} (${r.specialty})`);
    }
  }
}

main().catch(console.error).finally(() => pool.end());
