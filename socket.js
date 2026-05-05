/**
 * Socket.io Event Handlers
 * Handles real-time communication events
 */

const {
  normalizeRoomId,
  createPersistentRoom,
  joinRoom,
  leaveRoom,
  getUsers,
  getOtherUsers,
  persistentRoomExists,
} = require('./rooms');

// Store user information: socketId -> { userId, roomId, name }
const userSessions = new Map();

/**
 * Initialize socket event handlers
 * @param {object} io - Socket.io instance
 */
function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[CONNECTION] User connected: ${socket.id}`);

    const completeJoin = (roomId, userId, name) => {
      const cleanRoomId = normalizeRoomId(roomId);
      if (!cleanRoomId) {
        console.warn(`[JOIN] Cannot join room with empty ID`);
        return false;
      }

      userSessions.set(socket.id, { userId, roomId: cleanRoomId, name });
      joinRoom(cleanRoomId, socket.id);
      socket.join(cleanRoomId);

      const users = getUsers(cleanRoomId);

      socket.emit('room-users', {
        users: users
          .filter((id) => id !== socket.id)
          .map((id) => {
            const session = userSessions.get(id);
            return {
              socketId: id,
              userId: session?.userId,
              name: session?.name,
            };
          }),
      });

      socket.to(cleanRoomId).emit('user-joined', {
        socketId: socket.id,
        userId,
        name,
      });

      console.log(`[JOIN-ROOM] ${name} (${userId}) joined room ${cleanRoomId}`);
      return true;
    };

    /**
     * CREATE ROOM
     * Payload: { roomId, userId, name }
     */
    socket.on('create-room', async (data, callback) => {
      const { roomId, userId, name } = data || {};
      const cleanRoomId = normalizeRoomId(roomId);

      if (!cleanRoomId || !userId || !name) {
        callback?.({
          success: false,
          error: 'Missing roomId, userId, or name.',
        });
        return;
      }

      try {
        const result = await createPersistentRoom(cleanRoomId, {
          createdBy: userId,
          createdByName: name,
        });

        if (!result.success) {
          callback?.({
            success: false,
            error: result.error || 'Unable to create room.',
          });
          return;
        }

        const success = completeJoin(cleanRoomId, userId, name);
        callback?.({ success, roomId: cleanRoomId });
      } catch (error) {
        console.error('[CREATE-ROOM] Failed:', error);
        callback?.({
          success: false,
          error: 'Unable to create room.',
        });
      }
    });

    /**
     * USER JOIN EXISTING ROOM
     * Payload: { roomId, userId, name }
     */
    socket.on('join-room', async (data, callback) => {
      const { roomId, userId, name } = data || {};
      const cleanRoomId = normalizeRoomId(roomId);

      if (!cleanRoomId || !userId || !name) {
        callback?.({
          success: false,
          error: 'Missing roomId, userId, or name.',
        });
        return;
      }

      try {
        const exists = await persistentRoomExists(cleanRoomId);
        if (!exists) {
          callback?.({
            success: false,
            error: 'Room does not exist. Create it first.',
          });
          return;
        }

        const success = completeJoin(cleanRoomId, userId, name);
        callback?.({ success, roomId: cleanRoomId });
      } catch (error) {
        console.error('[JOIN-ROOM] Failed:', error);
        callback?.({
          success: false,
          error: 'Unable to join room.',
        });
      }
    });

    /**
     * SEND MESSAGE
     * Payload: { roomId, userId, message, timestamp }
     */
    socket.on('send-message', (data) => {
      const { roomId, userId, message, timestamp } = data;
      const cleanRoomId = normalizeRoomId(roomId);
      const session = userSessions.get(socket.id);

      if (!session || session.roomId !== cleanRoomId) {
        console.warn(`[MESSAGE] Unauthorized message from ${socket.id}`);
        return;
      }

      // Emit to all users in room (including sender)
      io.to(cleanRoomId).emit('receive-message', {
        socketId: socket.id,
        userId,
        name: session.name,
        message,
        timestamp: timestamp || new Date(),
      });

      console.log(`[MESSAGE] ${session.name}: ${message}`);
    });

    /**
     * PUSH-TO-TALK (Speaking Status)
     * Payload: { roomId, userId, isSpeaking }
     */
    socket.on('speaking', (data) => {
      const { roomId, userId, isSpeaking } = data;
      const cleanRoomId = normalizeRoomId(roomId);
      const session = userSessions.get(socket.id);

      if (!session || session.roomId !== cleanRoomId) {
        console.warn(`[SPEAKING] Unauthorized status from ${socket.id}`);
        return;
      }

      // Broadcast speaking status to all users in room
      io.to(cleanRoomId).emit('user-speaking', {
        socketId: socket.id,
        userId,
        name: session.name,
        isSpeaking,
      });

      console.log(
        `[SPEAKING] ${session.name} is ${isSpeaking ? 'speaking' : 'listening'}`
      );
    });

    /**
     * WEBRTC OFFER
     * Payload: { roomId, targetSocketId, offer }
     */
    socket.on('webrtc-offer', (data) => {
      const { roomId, targetSocketId, offer } = data;
      const cleanRoomId = normalizeRoomId(roomId);
      const session = userSessions.get(socket.id);

      if (!session || session.roomId !== cleanRoomId) {
        console.warn(`[WEBRTC] Unauthorized offer from ${socket.id}`);
        return;
      }

      // Send offer to target socket
      io.to(targetSocketId).emit('webrtc-offer', {
        fromSocketId: socket.id,
        offer,
      });

      console.log(
        `[WEBRTC] Offer sent from ${socket.id} to ${targetSocketId}`
      );
    });

    /**
     * WEBRTC ANSWER
     * Payload: { roomId, targetSocketId, answer }
     */
    socket.on('webrtc-answer', (data) => {
      const { roomId, targetSocketId, answer } = data;
      const cleanRoomId = normalizeRoomId(roomId);
      const session = userSessions.get(socket.id);

      if (!session || session.roomId !== cleanRoomId) {
        console.warn(`[WEBRTC] Unauthorized answer from ${socket.id}`);
        return;
      }

      // Send answer to target socket
      io.to(targetSocketId).emit('webrtc-answer', {
        fromSocketId: socket.id,
        answer,
      });

      console.log(
        `[WEBRTC] Answer sent from ${socket.id} to ${targetSocketId}`
      );
    });

    /**
     * WEBRTC ICE CANDIDATE
     * Payload: { roomId, targetSocketId, candidate }
     */
    socket.on('webrtc-ice-candidate', (data) => {
      const { roomId, targetSocketId, candidate } = data;
      const cleanRoomId = normalizeRoomId(roomId);
      const session = userSessions.get(socket.id);

      if (!session || session.roomId !== cleanRoomId) {
        console.warn(`[WEBRTC] Unauthorized ICE candidate from ${socket.id}`);
        return;
      }

      // Send ICE candidate to target socket
      io.to(targetSocketId).emit('webrtc-ice-candidate', {
        fromSocketId: socket.id,
        candidate,
      });

      console.log(
        `[WEBRTC] ICE candidate sent from ${socket.id} to ${targetSocketId}`
      );
    });

    /**
     * LEAVE ROOM
     * Payload: { roomId }
     */
    socket.on('leave-room', (data, callback) => {
      const { roomId } = data || {};
      const cleanRoomId = normalizeRoomId(roomId);
      const session = userSessions.get(socket.id);

      if (!cleanRoomId || !session) {
        callback?.({ success: false, error: 'Invalid room ID or session' });
        return;
      }

      if (session.roomId !== cleanRoomId) {
        callback?.({
          success: false,
          error: 'User is not in this room',
        });
        return;
      }

      const { userId, name } = session;
      leaveRoom(cleanRoomId, socket.id);
      socket.leave(cleanRoomId);
      socket.to(cleanRoomId).emit('user-left', {
        socketId: socket.id,
        userId,
        name,
      });
      userSessions.delete(socket.id);

      console.log(`[LEAVE-ROOM] ${name} (${userId}) left room ${cleanRoomId}`);
      callback?.({ success: true });
    });

    /**
     * DISCONNECT
     * Handle user disconnect
     */
    socket.on('disconnect', () => {
      const session = userSessions.get(socket.id);

      if (session) {
        const { roomId, userId, name } = session;

        // Remove from room
        leaveRoom(roomId, socket.id);

        // Notify others
        socket.to(roomId).emit('user-left', {
          socketId: socket.id,
          userId,
          name,
        });

        // Clean up user session
        userSessions.delete(socket.id);

        console.log(`[DISCONNECT] ${name} (${userId}) disconnected from ${roomId}`);
      } else {
        console.log(`[DISCONNECT] Unknown user ${socket.id} disconnected`);
      }
    });

    /**
     * ERROR HANDLING
     */
    socket.on('error', (error) => {
      console.error(`[SOCKET ERROR] ${socket.id}: ${error}`);
    });
  });
}

module.exports = initializeSocket;
