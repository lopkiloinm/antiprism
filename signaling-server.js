#!/usr/bin/env node

// Antiprism WebRTC Signaling Server
// Deploy to Railway for free WebRTC collaboration
// Usage: node signaling-server.js

import { WebSocketServer } from 'ws';
import http from 'http';

const port = process.env.PORT || 4444;
const wss = new WebSocketServer({ noServer: true });

const server = http.createServer((request, response) => {
  // Enable CORS for all origins
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (request.method === 'OPTIONS') {
    response.writeHead(200);
    response.end();
    return;
  }
  
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Antiprism WebRTC Signaling Server - Ready for connections!');
});

// Map from topic-name to set of subscribed clients
const topics = new Map();
const connections = new Set();

const send = (conn, message) => {
  if (conn.readyState === conn.OPEN) {
    try {
      conn.send(JSON.stringify(message));
    } catch (e) {
      console.log('❌ Failed to send message:', e.message);
      conn.close();
    }
  } else {
    conn.close();
  }
};

const onconnection = conn => {
  connections.add(conn);
  const subscribedTopics = new Set();
  let closed = false;
  
  console.log('🔗 New connection established');
  
  // Keep connection alive with ping/pong
  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      console.log('⏰ Connection timeout - closing');
      conn.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      try {
        conn.ping();
      } catch (e) {
        console.log('❌ Ping failed:', e.message);
        conn.close();
      }
    }
  }, 30000);
  
  conn.on('pong', () => {
    pongReceived = true;
  });
  
  conn.on('close', (code, reason) => {
    console.log('🔌 Connection closed:', code, reason?.toString());
    connections.delete(conn);
    
    // Clean up topic subscriptions
    subscribedTopics.forEach(topicName => {
      const subs = topics.get(topicName);
      if (subs) {
        subs.delete(conn);
        if (subs.size === 0) {
          topics.delete(topicName);
          console.log('📋 Topic removed:', topicName);
        }
      }
    });
    subscribedTopics.clear();
    closed = true;
    clearInterval(pingInterval);
  });
  
  conn.on('error', (error) => {
    console.log('❌ WebSocket error:', error.message);
    closed = true;
  });
  
  conn.on('message', message => {
    if (typeof message === 'string' || message instanceof Buffer) {
      try {
        message = JSON.parse(message);
      } catch (e) {
        console.log('❌ Invalid JSON received');
        return;
      }
    }
    
    if (message && message.type && !closed) {
      switch (message.type) {
        case 'subscribe':
          const topicsToSub = message.topics || [];
          console.log('📝 Subscribing to topics:', topicsToSub);
          topicsToSub.forEach(topicName => {
            if (typeof topicName === 'string') {
              const topic = topics.get(topicName) || new Set();
              topic.add(conn);
              topics.set(topicName, topic);
              subscribedTopics.add(topicName);
              console.log('👥 Topic subscribers:', topicName, topic.size);
            }
          });
          break;
          
        case 'unsubscribe':
          const topicsToUnsub = message.topics || [];
          topicsToUnsub.forEach(topicName => {
            const subs = topics.get(topicName);
            if (subs) {
              subs.delete(conn);
              if (subs.size === 0) {
                topics.delete(topicName);
              }
            }
          });
          break;
          
        case 'publish':
          if (message.topic) {
            const receivers = topics.get(message.topic);
            if (receivers) {
              message.clients = receivers.size;
              console.log('📡 Publishing to', receivers.size, 'clients in topic:', message.topic);
              receivers.forEach(receiver => send(receiver, message));
            } else {
              console.log('📭 No subscribers for topic:', message.topic);
            }
          }
          break;
          
        case 'ping':
          send(conn, { type: 'pong' });
          break;
          
        default:
          console.log('❓ Unknown message type:', message.type);
      }
    }
  });
};

wss.on('connection', onconnection);

server.on('upgrade', (request, socket, head) => {
  const handleAuth = ws => {
    wss.emit('connection', ws, request);
  };
  wss.handleUpgrade(request, socket, head, handleAuth);
});

server.listen(port, () => {
  console.log('');
  console.log('🚀 Antiprism WebRTC Signaling Server');
  console.log('📡 WebSocket: ws://localhost:' + port);
  console.log('🌐 HTTP: http://localhost:' + port);
  console.log('👥 Ready for WebRTC connections!');
  console.log('');
  console.log('💡 Usage:');
  console.log('   Deploy to Railway: railway up');
  console.log('   Test locally: ws://localhost:' + port);
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received - shutting down gracefully...');
  
  // Close all WebSocket connections
  connections.forEach(conn => {
    try {
      conn.close(1001, 'Server shutting down');
    } catch (e) {
      // Ignore errors during shutdown
    }
  });
  
  server.close(() => {
    console.log('✅ Server stopped gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received - shutting down gracefully...');
  process.emit('SIGTERM');
});
