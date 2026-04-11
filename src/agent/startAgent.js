import { runBaseline } from "./baseline.js";
import { watchFolders } from "./watcher.js";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

export async function startAgent(agent) {
  const agentId = agent.id;
  console.log("Using agent:", agentId);

  // 1. Send heartbeat
  await fetch(`${BACKEND_URL}/api/agents/heartbeat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, status: "active" })
  });
  console.log(`Heartbeat sent for agent ${agentId}`);

  // 2. Fetch all policies
  const policyRes = await fetch(`${BACKEND_URL}/api/policies`);
  const policies = await policyRes.json();

  // 2.1. Filter policies for this agent
  const agentPolicies = policies.filter(p => p.agentId === agentId);
  if (agentPolicies.length === 0) {
    console.warn(`⚠️ No policy found for agent ${agentId}, skipping...`);
    return;
  }

  // 2.2. Merge all folders and extensions
  const mergedPolicy = {
    folders: agentPolicies.flatMap(p => p.folders || []),
    allowedExtensions: agentPolicies.flatMap(p => p.allowedExtensions || []),
    forbiddenExtensions: agentPolicies.flatMap(p => p.forbiddenExtensions || []),
      blockedExtensions: agentPolicies.flatMap(p => p.blockedExtensions || [])
  };

  console.log("Loaded merged policy for", agentId, ":", mergedPolicy);

  // 3. Run baseline across all folders
  await runBaseline(agentId, mergedPolicy.folders);

  // 4. Start watcher across all folders
  console.log("Starting watcher with:", {
    agentId,
    folders: mergedPolicy.folders,
    allowedExtensions: mergedPolicy.allowedExtensions,
    forbiddenExtensions: mergedPolicy.forbiddenExtensions
  });
  watchFolders(agentId, mergedPolicy.folders, mergedPolicy.allowedExtensions, mergedPolicy.forbiddenExtensions, mergedPolicy.blockedExtensions
);
}

async function main() {
  // Fetch all agents
  const agentsRes = await fetch("http://localhost:7000/api/agents");
  const agents = await agentsRes.json();

  if (!Array.isArray(agents) || agents.length === 0) {
    throw new Error("No agents found in backend");
  }

  // Loop through each agent
  for (const agent of agents) {
    try {
      await startAgent(agent);
    } catch (err) {
      console.error(`Failed to start agent ${agent.id}:`, err.message);
    }
  }
}

main();
