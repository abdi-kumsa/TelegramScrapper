import { createClient } from "@libsql/client";

async function run() {
  const db = createClient({ url: "file:./test.db" });
  await db.execute("CREATE TABLE IF NOT EXISTS test (id INTEGER)");
  
  console.log("Starting transaction block...");
  const result = await db.transaction(async (tx) => {
    console.log("Inside callback!");
    await tx.execute("INSERT INTO test VALUES (1)");
  });
  
  console.log("Result of transaction call:", typeof result, result?.constructor?.name);
  
  const rows = await db.execute("SELECT COUNT(*) AS cnt FROM test");
  console.log("Rows in table:", rows.rows[0].cnt);
}

run().catch(console.error);
