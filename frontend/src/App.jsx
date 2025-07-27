import React from 'react';
import ChatRoom from './ChatRoom';
import './index.css';

export default function App() {
  return (
    <div>
      <h1 style={{ textAlign: 'center' }}>WebSocket Chat Room</h1>
      <ChatRoom />
    </div>
  );
}
