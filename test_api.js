const https = require('https');

console.log('Testing Amazon API endpoints...\n');

const testUrls = [
  {
    name: 'GET with query params',
    url: 'https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/simulator?num_calls=5&scenario=nashville_tornado',
    method: 'GET'
  },
  {
    name: 'POST with JSON body',
    url: 'https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/simulator',
    method: 'POST',
    data: JSON.stringify({num_calls: 5, scenario: 'nashville_tornado'})
  },
  {
    name: 'Base URL GET',
    url: 'https://czwz6e7qje.execute-api.us-east-1.amazonaws.com',
    method: 'GET'
  },
  {
    name: 'Base URL POST',
    url: 'https://czwz6e7qje.execute-api.us-east-1.amazonaws.com',
    method: 'POST',
    data: JSON.stringify({num_calls: 5, scenario: 'nashville_tornado'})
  }
];

function testEndpoint(test) {
  return new Promise((resolve) => {
    console.log(`Testing: ${test.name}`);
    console.log(`URL: ${test.url}`);
    console.log(`Method: ${test.method}`);
    
    const url = new URL(test.url);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Node.js Test'
      }
    };

    if (test.data) {
      options.headers['Content-Length'] = Buffer.byteLength(test.data);
    }

    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response: ${data}`);
        console.log('---\n');
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`Error: ${e.message}`);
      console.log('---\n');
      resolve();
    });

    if (test.data) {
      req.write(test.data);
    }
    
    req.end();
  });
}

async function runTests() {
  for (const test of testUrls) {
    await testEndpoint(test);
  }
  console.log('All tests completed!');
}

runTests();
