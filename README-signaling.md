# Antiprism WebRTC Signaling Server

A lightweight WebSocket signaling server for real-time collaboration in Antiprism LaTeX editor.

## What it does

- Helps peers find each other for WebRTC connections
- Exchanges connection offers/answers
- Never sees document content
- Temporary connection setup only

## Deployment

### Railway (Recommended)

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway up
```

3. Get your URL: `https://your-app-name.up.railway.app`

4. Add to Antiprism settings:
```
wss://your-app-name.up.railway.app
```

### Local Development

```bash
npm install
npm start
# Runs on ws://localhost:4444
```

## Usage in Antiprism

In Settings → WebRTC → Custom signaling servers, add:
```
wss://your-app-name.up.railway.app
```

## Free Tier Limits

- Railway: 500 hours/month free
- Handles ~100 concurrent connections
- Perfect for small teams
