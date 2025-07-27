import React, { useState, useEffect, useRef } from 'react';
import './ChatRoom.css';

export default function ChatRoom() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [userColors, setUserColors] = useState({});
  const ws = useRef(null);

  const colors = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080'];

  const getUserColor = (user) => {
    if (!userColors[user]) {
      const newColor = colors[Object.keys(userColors).length % colors.length];
      setUserColors(prev => ({ ...prev, [user]: newColor }));
      return newColor;
    }
    return userColors[user];
  };

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:5000');

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    return () => ws.current.close();
  }, []);

  const sendMessage = () => {
    if (input.trim() && username && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(`${username}: ${input}`);
      setInput('');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file || !username) return;

    // Send metadata (filename, username, caption)
    const meta = { filename: file.name, username, caption: input || '' };
    ws.current.send(`__file__:${JSON.stringify(meta)}`);

    // Send binary
    file.arrayBuffer().then(buffer => {
      ws.current.send(buffer);
      setInput(''); // clear caption after sending
    });
  };

  const handleEnterUsername = () => {
    if (username.trim()) setConnected(true);
  };

  if (!connected) {
    return (
      <div className="chat-container">
        <h2>Enter your username</h2>
        <div className="input-bar">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            onKeyDown={(e) => e.key === 'Enter' && handleEnterUsername()}
          />
          <button onClick={handleEnterUsername}>Join</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <h2>Welcome, {username}</h2>
      <div className="messages">
        {messages.map((msg, index) => {
          if (msg.type === 'text') {
            const [user, ...rest] = msg.text.split(': ');
            const color = getUserColor(user);
            return (
              <div key={index} className="message">
                <strong style={{ color }}>{user}:</strong> {rest.join(': ')}
              </div>
            );
          } else if (msg.type === 'file') {
            const url = `http://localhost:5000${msg.url}`;
            const color = getUserColor(msg.user || 'Unknown');

            const isImage = /\.(jpg|jpeg|png|gif)$/i.test(msg.name);
            const isAudio = /\.(mp3|wav)$/i.test(msg.name);

            return (
              <div key={index} className="message">
                <strong style={{ color }}>{msg.user}:</strong>
                {isImage ? (
                  <div>
                    <img src={url} alt={msg.name} style={{ maxWidth: '200px', display: 'block' }} />
                    {msg.caption && <p>{msg.caption}</p>}
                  </div>
                ) : isAudio ? (
                  <div>
                    <audio controls style={{ display: 'block', marginTop: '5px' }}>
                      <source src={url} type={`audio/${msg.name.endsWith('.wav') ? 'wav' : 'mpeg'}`} />
                      Your browser does not support the audio element.
                    </audio>
                    {msg.caption && <p>{msg.caption}</p>}
                  </div>
                ) : (
                  <div>
                    <a href={url} download={msg.name}>{msg.name}</a>
                    {msg.caption && <p>{msg.caption}</p>}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
      <div className="input-bar">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message (or caption for files)"
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
        <input type="file" onChange={handleFileSelect} />
      </div>
    </div>
  );
}
