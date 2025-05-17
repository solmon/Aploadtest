# API Load Testing Project

A load testing project using k6 to test API performance and reliability.

## Features

- Performance testing for API endpoints
- Authentication flow testing
- Configurable test profiles (debug and load testing)
- Reporting capabilities

## Getting Started

### Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed
- Node.js (for report generation)

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

## Project Structure

- `logintest.js` - Main test script for API authentication and requests
- `generate-report.js` - Report generation utility
- `results.json` - Output from test runs
- `reports/report.html` - Generated HTML report