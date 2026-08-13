/**
 * Smoke test for PDPA API v2.0 Modular Architecture
 * Usage: node tests/smoke-test.mjs
 */

const API_BASE = 'http://localhost:3000/api';

async function runSmokeTests() {
  console.log('🚀 Starting PDPA API Smoke Tests...');
  let passed = 0;
  let failed = 0;

  // We are mostly checking for 404s to ensure the routers are mounted correctly.
  // 401 (Unauthorized) or 400 (Bad Request) or 403 (Forbidden) is expected and considered PASSED for protected routes.
  const endpoints = [
    { name: 'Public Router', url: '/public/orgs', method: 'GET' },
    { name: 'Auth Router', url: '/auth/login', method: 'POST', body: { username: 'test', password: '123' } },
    { name: 'Users Router', url: '/users', method: 'GET' },
    { name: 'Workflow Router', url: '/workflow/states', method: 'GET' },
    { name: 'Reports Router', url: '/reports/summary', method: 'GET' },
    { name: 'Requests Router', url: '/requests', method: 'GET' },
    { name: 'SuperAdmin Router', url: '/superadmin/tenants', method: 'GET' },
    { name: 'Download Router (Public)', url: '/public/requests/123/download-package', method: 'POST', body: { otp: '123456' } },
    { name: 'Download Router (DL)', url: '/dl/info/token-123', method: 'GET' }
  ];

  for (const ep of endpoints) {
    try {
      process.stdout.write(`Testing ${ep.name.padEnd(25)} [${ep.method}] ${ep.url} ... `);
      const res = await fetch(`${API_BASE}${ep.url}`, {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
        body: ep.body ? JSON.stringify(ep.body) : undefined
      });
      
      // If the route is not mounted, Express will return 404 Not Found in HTML format.
      // If the route is mounted but fails validation/auth, it usually returns JSON with 400/401/403/500.
      if (res.status === 404) {
         console.log(`❌ FAILED (404 Not Found) - Router might not be mounted`);
         failed++;
      } else {
         console.log(`✅ PASSED (Status: ${res.status})`);
         passed++;
      }
    } catch (err) {
      if (err.cause?.code === 'ECONNREFUSED') {
          console.log(`❌ FAILED (Connection Refused) - Is the server running on port 3000?`);
      } else {
          console.log(`❌ FAILED (${err.message})`);
      }
      failed++;
    }
  }

  console.log(`\n🏁 Smoke Test Results: ${passed} Passed, ${failed} Failed`);
  if (failed > 0) {
      console.log('⚠️ Please check server.js mounts and make sure the server is running.');
      process.exit(1);
  } else {
      console.log('🎉 All routers are mounted successfully!');
      process.exit(0);
  }
}

runSmokeTests();
