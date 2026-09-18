// source/models/user.model.js
// Users collection. Covers passengers, department officers, senior
// authorities, and admins via a single `role` field (RBAC), rather than
// separate collections per role — simpler joins for complaint assignment.

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const env = require('../config/env');
const { ROLE_VALUES, ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: ROLES.PASSENGER,
      required: true,
      index: true,
    },
    // Only meaningful for OFFICER (their assigned department) — null for
    // passengers, senior authorities, and admins.
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    phone: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS);
};

// Never leak the password hash even if a document is accidentally serialized.
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
