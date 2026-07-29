const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
// Assuming the server uses the default random secret if not set, 
// I should just use the REST API to login first to get a real token.
// Node v24 has global fetch

async function test() {
  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'hr.owner', password: 'password123' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData);
    
    if (!loginData.token) {
       console.error('No token returned');
       return;
    }
    const token = loginData.token;
    
    const uploadRes = await fetch('http://localhost:3001/api/requests/req-001/tasks/task-001/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ filename: 'test.pdf', fileData: 'data:application/pdf;base64,JVBERi0xLjQKJ...' })
    });
    
    const uploadData = await uploadRes.json();
    console.log('Upload:', uploadData);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
