const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Track the last results data we've seen
let lastResults = null;

// Watch the results file and emit updates
function watchResultsFile() {
  const resultsPath = path.join(__dirname, '../results.json');
  
  try {
    if (fs.existsSync(resultsPath)) {
      // Initial read of existing data
      const data = fs.readFileSync(resultsPath, 'utf-8');
      if (data) {
        lastResults = processResults(data);
      }
    }
    
    // Watch for changes
    fs.watch(path.dirname(resultsPath), (eventType, filename) => {
      if (filename === 'results.json') {
        try {
          const data = fs.readFileSync(resultsPath, 'utf-8');
          if (data) {
            const processed = processResults(data);
            lastResults = processed;
            io.emit('results-update', processed);
          }
        } catch (error) {
          console.error('Error reading results file:', error);
        }
      }
    });
  } catch (error) {
    console.error('Error setting up file watch:', error);
  }
}

// Process the NDJSON format of the results file into a structured object
function processResults(rawData) {
  try {
    const lines = rawData.trim().split('\n');
    const data = {
      metrics: {},
      erroredUrls: []
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
        
        // Extract errored URLs from custom error metrics
        if (item.type === 'Error') {
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
        console.warn(`Skipping invalid JSON line: ${err.message}`);
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

            // Add the time series data for charts
            if (points.some(p => p.time)) {
              values.timeSeries = points.map(p => ({
                time: p.time ? new Date(p.time).getTime() : 0,
                value: p.value || 0,
                tags: p.tags || {}
              }));
            }
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
    
    // Add timestamp for when the data was processed
    data.processedAt = new Date().toISOString();
    
    return data;
  } catch (error) {
    console.error('Error processing results data:', error);
    return null;
  }
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Set up Socket.IO with the correct path
  const io = new Server(server, {
    path: '/api/socketio',
    addTrailingSlash: false
  });
  
  // Socket.IO connection handler
  io.on('connection', (socket) => {
    console.log('Client connected');
    
    // Send the current data to the newly connected client
    if (lastResults) {
      socket.emit('results-update', lastResults);
    }
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
  
  // Start watching the results file for changes
  watchResultsFile();

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Monitoring results.json for changes...`);
  });
});