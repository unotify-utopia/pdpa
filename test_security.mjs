import http from 'http';

const endpoints = [
  { method: 'GET', path: '/api/public/requests', expectedStatus: 404 },
  { method: 'GET', path: '/api/public/email-logs', expectedStatus: 401 },
  { method: 'POST', path: '/api/audit-logs', expectedStatus: 401 },
  { method: 'POST', path: '/api/notify/workflow', expectedStatus: 401 },
  { method: 'PUT', path: '/api/config', expectedStatus: 401 },
  { method: 'PUT', path: '/api/templates', expectedStatus: 401 }
];

async function testEndpoint({ method, path, expectedStatus }) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let pass = res.statusCode === expectedStatus || (expectedStatus === 401 && res.statusCode === 403);
      console.log(`[${pass ? 'PASS' : 'FAIL'}] ${method} ${path} -> Got ${res.statusCode} (Expected ~${expectedStatus})`);
      res.resume();
      resolve(pass);
    });

    req.on('error', (e) => {
      console.error(`[ERROR] ${method} ${path} -> ${e.message}`);
      resolve(false);
    });

    if (method === 'POST' || method === 'PUT') {
      req.write(JSON.stringify({ test: 'data' }));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Running Security Tests ---');
  let allPass = true;
  for (const ep of endpoints) {
    const pass = await testEndpoint(ep);
    if (!pass) allPass = false;
  }
  
  if (allPass) {
    console.log('\n✅ All tested endpoints are secure.');
  } else {
    console.log('\n❌ Some endpoints failed the security checks.');
  }
}

runTests();
