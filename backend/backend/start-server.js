import { spawn } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Function to find available port
async function findAvailablePort(startPort = 9000) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Start server with available port
async function startServer() {
  try {
    console.log('🔍 Finding available port...');
    const port = await findAvailablePort(9000);
    console.log(`✅ Found available port: ${port}`);
    
    // Set environment variable
    process.env.PORT = port;
    
    // Import and start the server
    const { default: app } = await import('./server.js');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();