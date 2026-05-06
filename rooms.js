/**
 * Room Management System
 * Manages persisted room membership and live socket presence.
 */

const Room = require('./models/Room');
const { isDatabaseConnected } = require('./db');

const EMPTY_ROOM_DELETE_DELAY_MS = 30000;

// Store active sockets: roomId -> Set of socketIds
const rooms = new Map();
const cleanupTimers = new Map();

function normalizeRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') {
    return '';
  }

  return roomId.trim().toLowerCase();
}

function createRoom(roomId) {
  const cleanId = normalizeRoomId(roomId);
  if (!cleanId) {
    console.warn('[ROOM] Cannot create room with empty ID');
    return false;
  }

  if (!rooms.has(cleanId)) {
    rooms.set(cleanId, new Set());
    console.log(`[ROOM] Created active room: ${cleanId}`);
    return true;
  }

  return false;
}

function cancelRoomCleanup(roomId) {
  const cleanId = normalizeRoomId(roomId);
  const timer = cleanupTimers.get(cleanId);
  if (timer) {
    clearTimeout(timer);
    cleanupTimers.delete(cleanId);
  }
}

// DISABLED: Rooms now permanent - no auto cleanup
function scheduleRoomCleanup(roomId) {
  // Rooms are permanent forever
}

async function createPersistentRoom(roomId, metadata = {}) {
  const cleanId = normalizeRoomId(roomId);
  const userId = metadata.createdBy;

  if (!cleanId) {
    return {
      success: false,
      created: false,
      error: 'Room ID is required.',
    };
  }

  if (!isDatabaseConnected()) {
    if (rooms.has(cleanId)) {
      return {
        success: false,
        created: false,
        error: 'Room already exists. Use Join Room instead.',
      };
    }

    createRoom(cleanId);
    return { success: true, created: true };
  }

  try {
    const room = await Room.create({
      roomId: cleanId,
      secretCode: cleanId.slice(0,6).toUpperCase(),
      users: userId ? [userId] : [],
      createdAt: new Date(),
    });


    cancelRoomCleanup(cleanId);
    createRoom(cleanId);
    console.log(`[ROOM] Persisted room: ${cleanId}`);
    return { success: true, created: Boolean(room) };
  } catch (error) {
    if (error?.code === 11000) {
      return {
        success: false,
        created: false,
        error: 'Room already exists. Use Join Room instead.',
      };
    }

    console.error('[ROOM] Failed to persist room:', error);
    return {
      success: false,
      created: false,
      error: 'Unable to create room.',
    };
  }
}

async function addUserToPersistentRoom(roomId, userId) {
  const cleanId = normalizeRoomId(roomId);
  if (!cleanId || !userId) {
    return false;
  }

  if (!isDatabaseConnected()) {
    return true;
  }

  const result = await Room.updateOne(
    { roomId: cleanId },
    { $addToSet: { users: userId } }
  );

  return result.matchedCount > 0;
}

async function removeUserFromPersistentRoom(roomId, userId) {
  const cleanId = normalizeRoomId(roomId);
  if (!cleanId || !userId || !isDatabaseConnected()) {
    return;
  }

  await Room.updateOne({ roomId: cleanId }, { $pull: { users: userId } });
  // No room deletion - rooms permanent
}

function joinRoom(roomId, socketId) {
  const cleanId = normalizeRoomId(roomId);
  if (!cleanId) {
    console.warn('[ROOM] Cannot join room with empty ID');
    return false;
  }

  cancelRoomCleanup(cleanId);

  if (!rooms.has(cleanId)) {
    createRoom(cleanId);
  }

  rooms.get(cleanId).add(socketId);
  console.log(`[ROOM] Socket ${socketId} joined room ${cleanId}`);
  return true;
}

function leaveRoom(roomId, socketId) {
  const cleanId = normalizeRoomId(roomId);
  if (!cleanId || !rooms.has(cleanId)) {
    return false;
  }

  rooms.get(cleanId).delete(socketId);
  console.log(`[ROOM] Socket ${socketId} left room ${cleanId}`);

  if (rooms.get(cleanId).size === 0) {
    rooms.delete(cleanId);
    scheduleRoomCleanup(cleanId);
    console.log(`[ROOM] Active room is empty: ${cleanId}`);
  }

  return true;
}

function getUsers(roomId) {
  const cleanId = normalizeRoomId(roomId);
  if (cleanId && rooms.has(cleanId)) {
    return Array.from(rooms.get(cleanId));
  }

  return [];
}

function getOtherUsers(roomId, socketId) {
  return getUsers(roomId).filter((id) => id !== socketId);
}

function roomExists(roomId) {
  const cleanId = normalizeRoomId(roomId);
  return Boolean(cleanId && rooms.has(cleanId));
}

async function persistentRoomExists(roomId) {
  const cleanId = normalizeRoomId(roomId);
  if (!cleanId) {
    return false;
  }

  if (rooms.has(cleanId)) {
    return true;
  }

  if (!isDatabaseConnected()) {
    return false;
  }

  const room = await Room.findOne({ roomId: cleanId }).lean();
  if (room) {
    createRoom(cleanId);
    return true;
  }

  return false;
}

function getRoomCount() {
  return rooms.size;
}

module.exports = {
  normalizeRoomId,
  createRoom,
  createPersistentRoom,
  addUserToPersistentRoom,
  removeUserFromPersistentRoom,
  joinRoom,
  leaveRoom,
  getUsers,
  getOtherUsers,
  roomExists,
  persistentRoomExists,
  getRoomCount,
};
