import { scanFolder, sendBaseline } from "./agent.js";
import db from "./db.js";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

export async function runBaseline(agentId) {
 const res = await fetch(`${BACKEND_URL}/api/policies/${agentId}`);
if (!res.ok) {
  throw new Error(`Failed to fetch policy: ${res.status} ${res.statusText}`);
}
const policy = await res.json();


  const allFiles = [];

  for (const folder of policy.folders) {
    const scanned = await scanFolder(folder);
    allFiles.push(...scanned);
console.log("Policy folders:", policy.folders);

    // record baseline version per folder
    db.run(
      `INSERT INTO Baselines (folder, createdAt, version) VALUES (?, ?, ?)`,
      [folder, new Date().toISOString(), "v1"]
    );
  }

  await sendBaseline(agentId, allFiles);
  console.log("Baseline sent:", allFiles.length, "files");
}
