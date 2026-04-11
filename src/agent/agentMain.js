import { registerAgent } from './registerAgent.js';
import { startAgent } from './startAgent.js';

async function main() {
  try {
    console.log('Starting Desktop Agent...');

    // Register or get existing agent
    const agent = await registerAgent();

    // Start the agent with the registered agent info
    await startAgent(agent);

    console.log('Desktop Agent started successfully.');
  } catch (error) {
    console.error('Failed to start Desktop Agent:', error);
    process.exit(1);
  }
}

main();