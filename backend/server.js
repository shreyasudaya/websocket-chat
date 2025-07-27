const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Set();
const messages = [];
const pendingFiles = new Map();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');

  // Send chat history
  messages.forEach(msg => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  });

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      const fileData = pendingFiles.get(ws);
      if (!fileData) return;

      const { filename, username, caption } = fileData;
      const filepath = path.join(uploadDir, filename);

      // Convert ArrayBuffer to Node Buffer
      const buffer = Buffer.from(data);

      fs.writeFile(filepath, buffer, (err) => {
        if (err) {
          console.error('Error saving file:', err);
          return;
        }
        const fileUrl = `/uploads/${filename}`;
        const fileMsg = { 
          type: 'file', 
          name: filename, 
          url: fileUrl, 
          user: username, 
          caption 
        };

        messages.push(fileMsg);
        broadcast(fileMsg);
        pendingFiles.delete(ws);
      });
    } else {
      const text = data.toString();

      // File metadata (JSON string prefixed with __file__)
      if (text.startsWith('__file__:')) {
        try {
          const meta = JSON.parse(text.replace('__file__:', '')); 
          pendingFiles.set(ws, meta); // Store until binary arrives
        } catch (err) {
          console.error('Invalid file metadata:', text);
        }
      } else {
        const textMsg = { type: 'text', text };
        messages.push(textMsg);
        broadcast(textMsg);
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    pendingFiles.delete(ws);
  });
});

function broadcast(message) {
  const str = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
