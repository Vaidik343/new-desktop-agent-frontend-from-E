import os from 'os';
import fetch from 'node-fetch';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7000';

async function getSystemInfo() {
  const hostname = os.hostname();
  const platform = os.platform();
  const release = os.release();

  // Get IP address
  const networkInterfaces = os.networkInterfaces();
  let ip = '127.0.0.1'; // fallback
  for (const iface of Object.values(networkInterfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ip = addr.address;
        break;
      }
    }
    if (ip !== '127.0.0.1') break;
  }

  return {
    name: hostname,
    os: `${platform} ${release}`,
    ip: ip
  };
}

async function registerAgent() {
  try {
    const systemInfo = await getSystemInfo();
    console.log('Registering agent with info:', systemInfo);

    const response = await fetch(`${BACKEND_URL}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(systemInfo)
    });

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Agent registered/ retrieved:', data.agentId);
    return { id: data.agentId, ...systemInfo };
  } catch (error) {
    console.error('Failed to register agent:', error);
    throw error;
  }
}

export { registerAgent };