# API Load Testing Project

A load testing project using k6 to test API performance and reliability.

## Features

- Performance testing for API endpoints
- Authentication flow testing
- Configurable test profiles (debug and load testing)
- Reporting capabilities
- **Live reporting system with real-time visualization**
- **Interactive charts with Chart.js**
- **WebSocket-based real-time updates**

## Getting Started

### Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed
- Node.js (for report generation)

### User Configuration

The project uses a `users.json` file to store user credentials. This file is excluded from git to prevent sensitive information from being committed to the repository.

#### users.json Format

The `users.json` file must be an array of user objects. Each user object requires the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `email` | string | User's email address for authentication |
| `password` | string | User's password for authentication |
| `companyName` | string | Company name for the authentication process |

Example `users.json` file:
```json
[
  {
    "email": "user@example.com",
    "password": "password123",
    "companyName": "CompanyName"
  },
  {
    "email": "user2@example.com",
    "password": "anotherpassword",
    "companyName": "CompanyName"
  }
]
```

You can add multiple user entries for load testing scenarios. The script will randomly select a user from this file for each test iteration, distributing the load across multiple accounts.

**Note:** The `users.json` file is automatically added to `.gitignore` to ensure credentials are not committed to the repository.

### Running Tests

For debugging with verbose output:
```
npm run rundebug
```

For standard load testing:
```
npm run runtest
```

For load testing with JSON results:
```
npm run loadtest
```

To generate an HTML report from results:
```
npm run report
```

### Live Reporting

You can use the live reporting system to visualize test results in real-time:

```
./run-live-test.sh
```

This script will:
1. Start the Next.js live report server
2. Open your browser to the live dashboard
3. Run the k6 load test with output to results.json
4. Keep the server running until you press Enter to close it

Alternatively, you can run the components separately:

```bash
# Start just the live report server
cd live-report
npm run dev

# In another terminal, run the test with JSON output
k6 run -o json=results.json logintest.js
```

## Live Report Features

The live reporting system provides:

- **Real-time Updates**: Dashboard updates automatically as test data comes in
- **Visual Charts**: 
  - Request counts and virtual users over time
  - Response times by endpoint
  - Check success/failure rates
  - Error distribution by endpoint
- **Detailed Metrics**:
  - Failed request URLs with status codes
  - HTTP request performance metrics (counts, durations)
  - Check statistics and success rates

The live report gives you immediate visibility into your load test performance, allowing you to identify issues as they happen rather than waiting for the test to complete.

## Project Structure

- `logintest.js` - Main test script for API authentication and requests
- `generate-report.js` - Report generation utility
- `results.json` - Output from test runs
- `reports/report.html` - Generated HTML report
- `users.json` - User credentials for authentication tests (not committed to git)
- `run-live-test.sh` - Script to run both the load test and live reporting server
- `live-report/` - Next.js application for live test visualization
  - `server.js` - Custom server with Socket.IO for real-time updates
  - `src/components/` - React components for the dashboard and charts