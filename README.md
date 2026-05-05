# Nexus Backend

Real-time communication backend for the Nexus walkie-talkie application.

## Features

- 🔌 Real-time socket communication with Socket.io
- 🏠 Room-based communication
- 💬 Chat messaging
- 🎤 Push-to-talk (speaking status)
- 🌐 WebRTC signaling (offer, answer, ICE candidates)
- 👥 User presence tracking
- 🔐 CORS enabled for frontend integration

## Project Structure

```
backend/
├── server.js       # Main Express server setup
├── socket.js       # Socket.io event handlers
├── rooms.js        # Room management system
├── package.json    # Dependencies and scripts
└── .gitignore      # Git ignore rules
```

## Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   or with pnpm:
   ```bash
   pnpm install
   ```

## Running the Server

### Development (with auto-reload):
```bash
npm run dev
```

### Production:
```bash
npm start
```

The server will start on **http://localhost:5000**

## API Endpoints

### Health Check
- **GET** `/` - Returns server status
- **GET** `/status` - Returns detailed server status

## Socket Events

### Client → Server

#### Join Room
```javascript
socket.emit('join-room', {
  roomId: 'room-123',
  userId: 'user-456',
  name: 'John Doe'
});
```

#### Send Message
```javascript
socket.emit('send-message', {
  roomId: 'room-123',
  userId: 'user-456',
  message: 'Hello!',
  timestamp: new Date()
});
```

#### Push-to-Talk (Speaking Status)
```javascript
socket.emit('speaking', {
  roomId: 'room-123',
  userId: 'user-456',
  isSpeaking: true
});
```

#### WebRTC Offer
```javascript
socket.emit('webrtc-offer', {
  roomId: 'room-123',
  targetSocketId: 'socket-789',
  offer: peerConnection.localDescription
});
```

#### WebRTC Answer
```javascript
socket.emit('webrtc-answer', {
  roomId: 'room-123',
  targetSocketId: 'socket-789',
  answer: peerConnection.localDescription
});
```

#### WebRTC ICE Candidate
```javascript
socket.emit('webrtc-ice-candidate', {
  roomId: 'room-123',
  targetSocketId: 'socket-789',
  candidate: iceCandidate
});
```

### Server → Client

#### Room Users
```javascript
socket.on('room-users', (data) => {
  // data.users = [{ socketId, userId, name }, ...]
});
```

#### User Joined
```javascript
socket.on('user-joined', (data) => {
  // data = { socketId, userId, name }
});
```

#### Receive Message
```javascript
socket.on('receive-message', (data) => {
  // data = { socketId, userId, name, message, timestamp }
});
```

#### User Speaking
```javascript
socket.on('user-speaking', (data) => {
  // data = { socketId, userId, name, isSpeaking }
});
```

#### User Left
```javascript
socket.on('user-left', (data) => {
  // data = { socketId, userId, name }
});
```

#### WebRTC Offer (Relay)
```javascript
socket.on('webrtc-offer', (data) => {
  // data = { fromSocketId, offer }
});
```

#### WebRTC Answer (Relay)
```javascript
socket.on('webrtc-answer', (data) => {
  // data = { fromSocketId, answer }
});
```

#### WebRTC ICE Candidate (Relay)
```javascript
socket.on('webrtc-ice-candidate', (data) => {
  // data = { fromSocketId, candidate }
});
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=development
```

## Dependencies

- **express** - Web framework
- **socket.io** - Real-time communication
- **cors** - Cross-Origin Resource Sharing
- **nodemon** (dev) - Auto-restart on file changes

## Architecture

### Room Management (`rooms.js`)
- Stores active rooms in a Map
- Each room contains a Set of socket IDs
- Automatic cleanup of empty rooms
- Functions for room operations (create, join, leave, get users)

### Socket Handler (`socket.js`)
- Manages all real-time events
- Maintains user sessions (userId, roomId, name)
- Routes messages and signaling to correct recipients
- Validates user authorization

### Server (`server.js`)
- Express app setup
- CORS configuration
- HTTP server creation
- Socket.io initialization
- Error handling and graceful shutdown

## Performance Considerations

- Rooms are stored in memory (suitable for small to medium deployments)
- For scalability, consider Redis adapter for Socket.io
- ICE candidates and WebRTC signals are relayed in real-time
- User sessions are cleaned up on disconnect

## Error Handling

- Unauthorized access attempts are logged and rejected
- Socket errors are caught and logged
- Server errors are handled gracefully
- Graceful shutdown on SIGTERM and SIGINT signals

## Security Notes

- CORS is configured for development (open to all origins)
- For production, restrict CORS to specific domains
- Consider adding authentication/authorization
- Validate all incoming data
- Use HTTPS/WSS in production

## Troubleshooting

### Connection Issues
- Ensure the server is running: `http://localhost:5000`
- Check firewall settings
- Verify client CORS configuration matches server

### Missing Rooms
- Rooms are automatically created when the first user joins
- Rooms are deleted when the last user leaves

### WebRTC Not Working
- Ensure both peers send offers and answers with correct targetSocketId
- Check that ICE candidates are being relayed properly
- Verify peer connection configuration on client side

## License

ISC
"# nexus-backend" 
