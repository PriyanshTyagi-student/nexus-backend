const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    currentSocketId: {
      type: String,
      default: null,
    },
    currentRoomId: {
      type: String,
      default: null,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

// Auto-expire sessions after 7 days of inactivity
// userSessionSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 604800 }); // Removed duplicate index

module.exports = mongoose.models.UserSession || mongoose.model('UserSession', userSessionSchema);
