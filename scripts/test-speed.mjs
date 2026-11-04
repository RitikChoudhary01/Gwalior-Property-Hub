import pg from "pg";

const poolerUrl = "postgresql://postgres.bhuthrpskgggeqwvsodl:PxWy2EG8TJ7C2Ygv@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres";
const directUrl = "postgresql://postgres.bhuthrpskgggeqwvsodl:PxWy2EG8TJ7C2Ygv@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";

async function test(url, name) {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  const t0 = Date.now();
  await client.connect();
  console.log(`${name} connect: ${Date.now() - t0}ms`);
  const t1 = Date.now();
  const res = await client.query('SELECT count(*) FROM "Property"');
  console.log(`${name} query: ${Date.now() - t1}ms, count = ${res.rows[0].count}`);
  await client.end();
}

async function main() {
  await test(poolerUrl, "Pooler :6543");
  await test(directUrl, "Direct :5432");
}

main().catch(console.error);

