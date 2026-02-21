#!/bin/bash

echo "🚀 Deploying Antiprism WebRTC Signaling Server to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Logging into Railway..."
railway login

# Deploy the signaling server
echo "📡 Deploying signaling server..."
railway up

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy your Railway URL (e.g., https://your-app.up.railway.app)"
echo "2. In Antiprism, go to Settings → WebRTC → Custom signaling servers"
echo "3. Add: wss://your-app.up.railway.app"
echo "4. Test real-time collaboration!"
