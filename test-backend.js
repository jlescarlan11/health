const http = require('http');

const BASE_URL = 'http://localhost:3000';
const LOCAL_IP = '192.168.1.5';
const BASE_URL_LAN = `http://${LOCAL_IP}:3000`;

async function testEndpoint(url, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`✓ ${name}: Status ${res.statusCode}`);
        if (data) {
          try {
            const json = JSON.parse(data);
            console.log(`  Response:`, JSON.stringify(json, null, 2));
          } catch {
            console.log(`  Response:`, data);
          }
        }
        resolve({ success: res.statusCode === 200, statusCode: res.statusCode });
      });
    });

    req.on('error', (error) => {
      console.log(`✗ ${name}: Error - ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`✗ ${name}: Timeout`);
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

async function runTests() {
  console.log('Testing backend endpoints...\n');

  console.log('Testing localhost endpoints:');
  const healthLocal = await testEndpoint(`${BASE_URL}/health`, 'Health Check (localhost)');
  const facilitiesLocal = await testEndpoint(
    `${BASE_URL}/api/facilities`,
    'Facilities (localhost)',
  );

  console.log('\nTesting LAN IP endpoints:');
  const healthLAN = await testEndpoint(`${BASE_URL_LAN}/health`, 'Health Check (LAN IP)');
  const facilitiesLAN = await testEndpoint(`${BASE_URL_LAN}/api/facilities`, 'Facilities (LAN IP)');

  console.log('\n--- Summary ---');
  console.log(`Health (localhost): ${healthLocal.success ? '✓' : '✗'}`);
  console.log(`Facilities (localhost): ${facilitiesLocal.success ? '✓' : '✗'}`);
  console.log(`Health (LAN IP): ${healthLAN.success ? '✓' : '✗'}`);
  console.log(`Facilities (LAN IP): ${facilitiesLAN.success ? '✓' : '✗'}`);

  if (
    healthLocal.success &&
    facilitiesLocal.success &&
    healthLAN.success &&
    facilitiesLAN.success
  ) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed. Make sure the backend server is running.');
    process.exit(1);
  }
}

runTests();
