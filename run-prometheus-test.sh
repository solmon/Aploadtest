#!/bin/bash

# Start the Prometheus and Grafana containers
echo "📊 Starting Prometheus and Grafana..."
cd infra
docker-compose up -d
cd ..

# Wait for Prometheus to start
echo "⏳ Waiting for Prometheus to start..."
sleep 5

# Install k6 with Prometheus extension if not already installed
if ! command -v k6 &> /dev/null
then
    echo "🔧 Installing k6..."
    curl -s https://packagecloud.io/install/repositories/k6/k6/script.deb.sh | sudo bash
    sudo apt-get install -y k6
    
    echo "🔌 Installing k6 Prometheus extension..."
    k6 extension install github.com/grafana/xk6-output-prometheus-remote
fi

# Run the k6 test with Prometheus output
echo "🚀 Running k6 test with Prometheus output..."
k6 run --out=prometheus-remote logintest-prometheus.js

# Provide instructions to access Grafana
echo "✅ Test complete!"
echo ""
echo "📈 You can view the test results in Grafana at http://localhost:3001"
echo "   - Username: admin"
echo "   - Password: admin"
echo ""
echo "To stop Prometheus and Grafana, run:"
echo "cd infra && docker-compose down"