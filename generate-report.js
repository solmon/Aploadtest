const fs = require('fs');
const path = require('path');

// Read the JSON results from the k6 test
try {
  const rawData = fs.readFileSync('results.json', 'utf-8');
  
  // Split the file by lines and parse each line as JSON
  const lines = rawData.trim().split('\n');
  
  // Process the NDJSON format and extract metrics
  const processedData = processNDJSON(lines);
  
  // Create a reports directory if it doesn't exist
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }
  
  // Generate a simple HTML report
  const htmlReport = generateHtmlReport(processedData);
  fs.writeFileSync(path.join(reportsDir, 'report.html'), htmlReport);
  
  console.log('HTML report generated in ./reports/report.html');
  
  // Print a summary to the console
  printSummary(processedData);
} catch (error) {
  console.error('Error processing results:', error);
  process.exit(1);
}

// Process NDJSON format and convert to appropriate structure
function processNDJSON(lines) {
  const data = {
    metrics: {},
    erroredUrls: [] // New array to store errored URLs
  };
  
  // Collect metric definitions and points
  const metricDefinitions = {};
  const metricPoints = {};
  
  // Group vus info to store in data.root_group
  let maxVus = 0;
  
  lines.forEach(line => {
    try {
      const item = JSON.parse(line);
      
      // Store metric definitions
      if (item.type === 'Metric') {
        metricDefinitions[item.metric] = item.data;
      }
      
      // For point data, collect them by metric name
      if (item.type === 'Point' || (item.metric && !item.type)) {
        if (!metricPoints[item.metric]) {
          metricPoints[item.metric] = [];
        }
        metricPoints[item.metric].push(item.data);
        
        // Track max VUs
        if (item.metric === 'vus_max') {
          const value = parseInt(item.data.value);
          if (value > maxVus) {
            maxVus = value;
          }
        }
      }
      
      // Extract errored URLs from custom error metrics (added in the test script)
      if (item.type === 'Error') {
        // Process error data
        if (item.data && item.data.error_code !== undefined) {
          data.erroredUrls.push({
            url: item.data.scenario || item.data.request_url || 'Unknown URL',
            status: item.data.error_code,
            message: item.data.error_message || 'Request failed',
            endpoint: item.data.endpoint || item.metric || 'Unknown',
            count: 1
          });
        }
      }

      // Process URL details from HTTP metrics
      if (item.metric === 'http_req_failed' && item.data && item.data.tags && item.data.value === 1) {
        // This is a failed request with tags
        const url = item.data.tags.url || 'Unknown URL';
        const name = item.data.tags.name || 'Unknown Endpoint';
        
        // Add to errored URLs if not already there
        const existingError = data.erroredUrls.find(e => e.url === url);
        if (existingError) {
          existingError.count++;
        } else {
          data.erroredUrls.push({
            url: url,
            status: item.data.tags.status || 'Error',
            message: 'Request failed',
            endpoint: name,
            count: 1
          });
        }
      }
      
    } catch (err) {
      console.warn(`Skipping invalid JSON line: ${line}`);
    }
  });
  
  // Process the collected points into metrics format
  for (const metricName in metricDefinitions) {
    const definition = metricDefinitions[metricName];
    const points = metricPoints[metricName] || [];
    
    // Create the values object based on the metric type
    const values = {};
    
    switch (definition.type) {
      case 'counter':
        // Sum values for counters
        values.count = points.reduce((sum, point) => sum + (point.value || 0), 0);
        break;
      case 'gauge':
        // Take max value for gauges
        values.value = points.length > 0 ? Math.max(...points.map(p => p.value || 0)) : 0;
        break;
      case 'rate':
        // Count passes/fails and calculate rate
        const passes = points.filter(p => p.value === 1).length;
        const fails = points.filter(p => p.value === 0).length;
        const total = passes + fails;
        values.passes = passes;
        values.fails = fails;
        values.rate = total > 0 ? passes / total : 0;
        break;
      case 'trend':
        // Calculate statistics for trends (avg, min, max, percentiles)
        if (points.length > 0) {
          const vals = points.map(p => p.value || 0);
          vals.sort((a, b) => a - b);
          values.min = vals[0];
          values.max = vals[vals.length - 1];
          values.avg = vals.reduce((sum, v) => sum + v, 0) / vals.length;
          
          // Calculate 95th percentile
          const p95Index = Math.ceil(vals.length * 0.95) - 1;
          values.p95 = vals[p95Index >= 0 ? p95Index : 0];
        }
        break;
    }
    
    // Add the metric to the data structure
    data.metrics[metricName] = {
      values: values
    };
  }
  
  // Add some root group info for compatibility
  data.root_group = {
    groups: {
      authentication: {
        vus: maxVus
      }
    },
    metrics: {
      iterations: {
        values: {
          count: metricPoints.iterations ? metricPoints.iterations.length : 0
        }
      }
    }
  };
  
  return data;
}

function generateHtmlReport(data) {
  // Extract key metrics
  const metrics = data.metrics || {};
  
  // Format date
  const reportDate = new Date().toLocaleString();
  
  // Extract HTTP metrics
  const httpReqs = metrics.http_reqs?.values?.count || 0;
  const httpFailed = metrics.http_req_failed?.values?.passes || 0;
  const httpAvgDuration = metrics.http_req_duration?.values?.avg?.toFixed(2) || 0;
  const httpP95Duration = metrics.http_req_duration?.values?.p95?.toFixed(2) || 0;
  const httpMaxDuration = metrics.http_req_duration?.values?.max?.toFixed(2) || 0;
  
  // Extract checks
  const checksRate = metrics.checks?.values?.rate || 0;
  const checksPasses = metrics.checks?.values?.passes || 0;
  const checksFails = metrics.checks?.values?.fails || 0;
  
  // Errored URLs
  const erroredUrls = data.erroredUrls || [];
  
  // Build HTML
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K6 Load Test Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    h1, h2, h3 {
      color: #0066cc;
    }
    .summary {
      background-color: #f5f5f5;
      border-radius: 5px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .metric-card {
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #0066cc;
    }
    .success { color: #28a745; }
    .warning { color: #ffc107; }
    .danger { color: #dc3545; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px 15px;
      border-bottom: 1px solid #ddd;
      text-align: left;
    }
    th {
      background-color: #f8f8f8;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
  </style>
</head>
<body>
  <h1>K6 Load Test Report</h1>
  <p>Report generated: ${reportDate}</p>
  
  <div class="summary">
    <h2>Summary</h2>
    <p>This report shows the results of the authentication load test.</p>
  </div>
  
  <div class="metrics">
    <div class="metric-card">
      <h3>Total Requests</h3>
      <div class="metric-value">${httpReqs}</div>
    </div>
    
    <div class="metric-card">
      <h3>Failed Requests</h3>
      <div class="metric-value ${httpFailed > 0 ? 'danger' : 'success'}">${httpFailed}</div>
    </div>
    
    <div class="metric-card">
      <h3>Checks Success Rate</h3>
      <div class="metric-value ${checksRate >= 0.95 ? 'success' : checksRate >= 0.9 ? 'warning' : 'danger'}">
        ${(checksRate * 100).toFixed(2)}%
      </div>
    </div>
    
    <div class="metric-card">
      <h3>Average Response Time</h3>
      <div class="metric-value">${httpAvgDuration} ms</div>
    </div>
    
    <div class="metric-card">
      <h3>95th Percentile</h3>
      <div class="metric-value">${httpP95Duration} ms</div>
    </div>
    
    <div class="metric-card">
      <h3>Max Response Time</h3>
      <div class="metric-value">${httpMaxDuration} ms</div>
    </div>
  </div>
  
  <h2>Failed Request URLs</h2>
  ${erroredUrls.length > 0 ? `
  <table>
    <tr>
      <th>Endpoint</th>
      <th>URL</th>
      <th>Status</th>
      <th>Count</th>
    </tr>
    ${erroredUrls.map(error => `
    <tr>
      <td>${error.endpoint}</td>
      <td>${error.url}</td>
      <td>${error.status}</td>
      <td>${error.count}</td>
    </tr>
    `).join('')}
  </table>
  ` : '<p>No failed requests detected.</p>'}
  
  <h2>Checks</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
    </tr>
    <tr>
      <td>Passed Checks</td>
      <td>${checksPasses}</td>
    </tr>
    <tr>
      <td>Failed Checks</td>
      <td>${checksFails}</td>
    </tr>
    <tr>
      <td>Success Rate</td>
      <td>${(checksRate * 100).toFixed(2)}%</td>
    </tr>
  </table>
  
  <h2>HTTP Request Details</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
    </tr>
    <tr>
      <td>Total Requests</td>
      <td>${httpReqs}</td>
    </tr>
    <tr>
      <td>Failed Requests</td>
      <td>${httpFailed}</td>
    </tr>
    <tr>
      <td>Average Duration</td>
      <td>${httpAvgDuration} ms</td>
    </tr>
    <tr>
      <td>95th Percentile</td>
      <td>${httpP95Duration} ms</td>
    </tr>
    <tr>
      <td>Maximum Duration</td>
      <td>${httpMaxDuration} ms</td>
    </tr>
  </table>
  
  <div>
    <h2>Instructions</h2>
    <p>To run the tests again:</p>
    <pre>npm run runtest</pre>
    <p>For debugging with verbose output:</p>
    <pre>npm run rundebug</pre>
  </div>
</body>
</html>`;
}

function printSummary(data) {
  const metrics = data.metrics || {};
  const erroredUrls = data.erroredUrls || [];
  
  console.log("\n===== K6 LOAD TEST SUMMARY =====");
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.log("\n=== HTTP REQUESTS ===");
  console.log(`Total requests: ${metrics.http_reqs?.values?.count || 0}`);
  console.log(`Failed requests: ${metrics.http_req_failed?.values?.passes || 0}`);
  console.log(`Average response time: ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms`);
  console.log(`95th percentile: ${metrics.http_req_duration?.values?.p95?.toFixed(2) || 0}ms`);
  
  console.log("\n=== CHECKS ===");
  console.log(`Passed checks: ${metrics.checks?.values?.passes || 0}`);
  console.log(`Failed checks: ${metrics.checks?.values?.fails || 0}`);
  console.log(`Success rate: ${((metrics.checks?.values?.rate || 0) * 100).toFixed(2)}%`);
  
  console.log("\n=== LOAD TESTING ===");
  console.log(`Virtual users max: ${data.root_group?.groups?.authentication?.vus || 0}`);
  console.log(`Iterations completed: ${data.root_group?.metrics?.iterations?.values?.count || 0}`);
  
  if (erroredUrls.length > 0) {
    console.log("\n=== FAILED REQUEST URLS ===");
    erroredUrls.forEach(error => {
      console.log(`[${error.endpoint}] ${error.url} - Status: ${error.status} (${error.count} occurrences)`);
    });
  }
  
  console.log("\n===============================");
}