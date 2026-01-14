const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        // Prefer private IP ranges
        const addr = iface.address;
        if (addr.startsWith('192.168.') || addr.startsWith('10.') || addr.startsWith('172.')) {
          return addr;
        }
      }
    }
  }

  // Fallback: return first non-internal IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

const localIP = getLocalIP();
console.log(localIP);
