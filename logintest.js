import http from 'k6/http'
import { sleep, check } from 'k6'
import { SharedArray } from 'k6/data'
import encoding from 'k6/encoding';

// Standard load test profile
const defaultOptions = {
  stages: [
    { duration: '30s', target: 5 },  // Ramp up to 5 users
    { duration: '1m', target: 5 },   // Stay at 5 users for 1 minute
    { duration: '30s', target: 0 }   // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% of requests must complete below 2s
    'http_req_failed': ['rate<0.1'],      // Less than 10% of requests can fail
  }
};

// Debug profile - single user, verbose logging
const debugOptions = {
  vus: 1,
  iterations: 1,
  thresholds: {},
  noConnectionReuse: true, // Don't reuse connections, like a typical browser
  insecureSkipTLSVerify: true, // Skip HTTPS certificate verification for internal testing
};

// Export options based on the environment variable
export function getOptions() {
  if (__ENV.DEBUG === 'true') {
    console.log('🔍 Running in DEBUG mode with verbose logging');
    return debugOptions;
  } else {
    console.log('🚀 Running standard load test');
    return defaultOptions;
  }
}

export let options = getOptions();

// You can replace this with your actual user credentials or use a CSV/JSON file
const credentials = new SharedArray('users', function() {
  return [
    { email: 'ruchita.deshmukh@activpayroll.com', password: 'NewPassword@10', companyName:"Template" }
  ];
});

export default function() {
  const isDebug = __ENV.DEBUG === 'true';
  
  // Get credentials for this iteration
  const user = credentials[Math.floor(Math.random() * credentials.length)];
  
  if (isDebug) console.log(`👤 Using credentials: ${user.email}`);
  
  // Step 1: Initial visit to login page
  if (isDebug) console.log('Step 1: Visiting login page...');
  let response = http.get('https://test.activpayroll.com/persistent/activ8/login/Template', {
    tags: { name: 'VisitLoginPage' }
  });
  
  check(response, {
    'login page loaded': (r) => r.status === 200,
  });
  
  if (isDebug) console.log(`Login page response: Status ${response.status}, Size: ${response.body.length} bytes`);
  sleep(1);
  
  // Step 2: Check if user is locked out
  if (isDebug) console.log('Step 2: Checking if user is locked out...');
  response = http.get(`https://test.activpayroll.com/persistent/activ8api/api/userSensitive/isUserLockedOut?email=${user.email}&companyName=Template`, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "authorization": "None",
      "cache-control": "no-cache",
      "content-type": "application/json",
      "pragma": "no-cache",
      "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    },
    tags: { name: 'CheckUserLockStatus' }
  });
  
  const lockStatus = check(response, {
    'user not locked out': (r) => r.status === 200 && r.body === 'false',
  });
  
  if (isDebug) {
    console.log(`Lock status response: ${response.status}`);
    console.log(`Response body: ${response.body}`);
    if (!lockStatus) console.log('⚠️ WARNING: User appears to be locked out!');
  }
  
  sleep(2);
  
  // Step 3: Authenticate user
  if (isDebug) console.log('Step 3: Authenticating user...');
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
    companyName: user.companyName
  });
  
  if (isDebug) console.log(`Login payload: ${loginPayload}`);
  
  response = http.post('https://test.activpayroll.com/persistent/activ8api/api/authenticate', loginPayload, {
    headers: {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "authorization": "Basic " + encoding.b64encode(`${user.email}:${user.password}:${user.companyName}`),
    },
    tags: { name: 'Login' }
  });
  
  // Check if login was successful and extract token
  const loginSuccess = check(response, {
    'login successful': (r) => r.status === 200,
    'has token': (r) => JSON.parse(r.body).jwt !== undefined,
  });
  
  if (isDebug) {
    console.log(`Login response status: ${response.status}`);
    console.log(`Login response body: ${response.body}`);
    if (!loginSuccess) console.log('❌ ERROR: Login failed!');
  }
  
  const token = response.status === 200 ? JSON.parse(response.body).jwt : null;
  
  if (token) {
    // Step 4: Access protected resource using the token
    if (isDebug) {
      console.log('Step 4: Accessing protected resource with token...');
      console.log(`Token: ${token.substring(0, 15)}...`);
    }
    
    response = http.get('https://test.activpayroll.com/persistent/activ8api/api/featureflags', {
      headers: {
        "accept": "application/json, text/plain, */*",
        "authorization": `Token ${token}`,
        "content-type": "application/json",
      },
      tags: { name: 'FeatureFlags' }
    });
    
    const profileSuccess = check(response, {
      'featureflags accessed': (r) => r.status === 200,
    });
    
    if (isDebug) {
      console.log(`Profile response status: ${response.status}`);
      console.log(`Profile response body: ${response.body}`);
      if (!profileSuccess) console.log('❌ ERROR: Failed to access featureflags!');
    }
  }
  
  if (isDebug) console.log('✅ Test iteration complete');
  sleep(3);
}
