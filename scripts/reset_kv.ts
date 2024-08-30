async function resetKV() {
  console.log("Starting KV database reset...");

  // Open the default KV database
  const kv = await Deno.openKv();

  // Iterate over all entries and delete them
  for await (const entry of kv.list({ prefix: [] })) {
    await kv.delete(entry.key);
  }

  // Close the database connection
  kv.close();

  console.log("KV database reset complete.");
}

// Run the reset function
await resetKV();
