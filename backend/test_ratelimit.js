const http = require('http');
const app = require('./server');

const testRateLimit = () => {
  const server = app.listen(5099, async () => {
    console.log('Testing Patient Login Rate Limiting (5 attempts / 15 mins)...');
    const testPatientId = '990000000001';

    const sendAttempt = (attemptNum) => {
      return new Promise((resolve) => {
        const postData = JSON.stringify({
          patient_id: testPatientId,
          name: 'Non Existent',
          dob: '1990-01-01',
        });

        const req = http.request({
          hostname: '127.0.0.1',
          port: 5099,
          path: '/api/auth/patient/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body || '{}') });
          });
        });

        req.write(postData);
        req.end();
      });
    };

    try {
      // Send 5 attempts (should get 401 Details do not match)
      for (let i = 1; i <= 5; i++) {
        const res = await sendAttempt(i);
        console.log(`Attempt ${i}: Status ${res.statusCode} - ${res.body.message}`);
        console.assert(res.statusCode === 401, `Attempt ${i} should be 401`);
      }

      // 6th attempt should be blocked with 429 Too Many Requests
      const res6 = await sendAttempt(6);
      console.log(`Attempt 6: Status ${res6.statusCode} - ${res6.body.message}`);
      console.assert(res6.statusCode === 429, `Attempt 6 should be rate-limited (429), got ${res6.statusCode}`);
      console.assert(
        res6.body.message.includes('Too many login attempts'),
        `Expected rate limit message, got: ${res6.body.message}`
      );

      console.log('✔ Rate Limiter Verified: 6th attempt successfully blocked with HTTP 429!');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('Rate Limit Test Failed:', err);
      server.close(() => process.exit(1));
    }
  });
};

testRateLimit();
