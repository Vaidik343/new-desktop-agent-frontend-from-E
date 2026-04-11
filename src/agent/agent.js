import fs from "fs";
import path from "path";
import crypto from "crypto";
import sqlite3 from "sqlite3";
import fetch from "node-fetch";
import db from "./db.js";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';



function hashFile(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function insertFile(file) {
  db.run(
    `INSERT OR REPLACE INTO Files (path, hash, size, modifiedAt, folder) VALUES (?, ?, ?, ?, ?)`,
    [file.path, file.hash, file.size, file.modifiedAt, file.folder]
  );
}

async function scanFolder(folderPath) {
  const files = fs.readdirSync(folderPath);
  const results = [];

  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const stats = fs.statSync(fullPath);
    if (stats.isFile()) {
      const hash = hashFile(fullPath);
      const record = {
        path: fullPath,
        hash,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        folder: folderPath
      };
      insertFile(record);
      results.push(record);
    }
  }

  return results;
}

async function sendBaseline(agentId, files) {
  const chunkSize = 100;
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    await fetch(`${BACKEND_URL}/api/files/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, files: chunk })
    });
  }
}
// agent.js
export { scanFolder, sendBaseline };
