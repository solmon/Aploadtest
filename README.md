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

## Project Structure

- `logintest.js` - Main test script for API authentication and requests
- `generate-report.js` - Report generation utility
- `results.json` - Output from test runs
- `reports/report.html` - Generated HTML report
- `users.json` - User credentials for authentication tests (not committed to git)