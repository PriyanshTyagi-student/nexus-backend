/**
 * Room Management System
 * Manages rooms and users in each room
 */

// Store rooms: roomId -> Set of socketIds
const rooms = new Map();

/**
 * Normalize room ID for consistency
 * @param {string} roomId - Raw room identifier
 * @returns {string} Normalized room ID (trimmed and lowercase)
 */
function normalizeRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') {
    return '';
  }
  return roomId.trim().toLowerCase();
}

/**
 * Create a new room
 * @param {string} roomId - Unique identifier for the room
 */
function createRoom(roomId) {
  const cleanId = normalizeRoomId(roomId);
  if (!cleanId) {
    console.warn(`[ROOM] Cannot create room with empty ID`);
    return false;
  }

  if (!rooms.has(cleanId)) {
    rooms.set(cleanId, new Set());
    console.log(`[ROOM] Created room: ${cleanId}`);
    return true;
  }
  return false;
}

/**
 * Add a user (socket) to a room
 * @param {string} roomId - Room identifier
 * @param {string} socketId - Socket identifier
 */
function joinRoom(roomId, socketId) {
  const cleanId = normalizeRoomId(roomId);
  if (!cleanId) {
    console.warn(`[ROOM] Cannot join room with empty ID`);
    return false;
  }

  if (!rooms.has(cleanId)) {
    createRoom(cleanId);
  }
  rooms.get(cleanId).add(socketId);
  console.log(`[ROOM] Socket ${socketId} joined room ${cleanId}`);
  return true;
}

/**
 * Remove a user (socket) from a room
 * @param {string} roomId - Room identifier
 * @param {string} socketId - Socket identifier
 */
function leaveRoom(roomId, socketId) {
  const cleanId = normalizeRoomId(roomId);
  if (!cleanId || !rooms.has(cleanId)) {
    return false;
  }

  rooms.get(cleanId).delete(socketId);
  console.log(`[ROOM] Socket ${socketId} left room ${cleanId}`);

  // Delete room if empty
  if (rooms.get(cleanId).size === 0) {
    rooms.delete(cleanId);
    console.log(`[ROOM] Deleted empty room: ${cleanId}`);
  }
  return true;
}

/**
 * Get all users (socket IDs) in a room
 * @param {string} roomId - Room identifier
 * @returns {Array<string>} Array of socket IDs in the room
 */
function getUsers(roomId) {
  const cleanId = normalizeRoomId(roomId);
  if (cleanId && rooms.has(cleanId)) {
    return Array.from(rooms.get(cleanId));
  }
  return [];
}

/**
 * Get all users except a specific socket
 * @param {string} roomId - Room identifier
 * @param {string} socketId - Socket to exclude
 * @returns {Array<string>} Array of socket IDs excluding the specified socket
 */
function getOtherUsers(roomId, socketId) {
  return getUsers(roomId).filter((id) => id !== socketId);
}

/**
 * Check if a room exists
 * @param {string} roomId - Room identifier
 * @returns {boolean}
 */
function roomExists(roomId) {
  const cleanId = normalizeRoomId(roomId);
  return cleanId && rooms.has(cleanId);
}

/**
 * Get room count
 * @returns {number}
 */
function getRoomCount() {
  return rooms.size;
}

module.exports = {
  normalizeRoomId,
  createRoom,
  joinRoom,
  leaveRoom,
  getUsers,
  getOtherUsers,
  roomExists,
  getRoomCount,
};
