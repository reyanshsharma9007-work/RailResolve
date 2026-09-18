// source/middleware/auth.middleware.js
// Verifies the Bearer JWT on protected routes and attaches the
// authenticated user (minus passwordHash) to req.user. Does not perform
// role checks — that's rbac.middleware.js's job, kept separate so each
// middleware has one responsibility.

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/user.model');

const authenticate = catchAsync(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Session expired, please log in again', 'TOKEN_EXPIRED');
    }
    throw AppError.unauthorized('Invalid authentication token', 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub);

  if (!user) {
    throw AppError.unauthorized('User account no longer exists', 'USER_NOT_FOUND');
  }

  if (!user.isActive) {
    throw AppError.unauthorized('This account has been disabled', 'ACCOUNT_DISABLED');
  }

  req.user = user;
  next();
});

module.exports = authenticate;
