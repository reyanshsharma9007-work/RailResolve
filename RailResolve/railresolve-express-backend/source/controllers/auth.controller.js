// source/controllers/auth.controller.js
// HTTP layer for authentication. Parses/validates the request, delegates
// business logic to auth.service.js, and shapes the response.

const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const { validateRegisterPayload, validateLoginPayload } = require('../validators/auth.validator');
const validateRequest = require('../utils/validateRequest');
const authService = require('../services/auth.service');

const register = catchAsync(async (req, res) => {
  validateRequest(validateRegisterPayload(req.body));

  const { user, token } = await authService.registerPassenger(req.body, req.ip);

  sendSuccess(res, {
    statusCode: 201,
    message: 'Account created successfully',
    data: { user, token },
  });
});

const login = catchAsync(async (req, res) => {
  validateRequest(validateLoginPayload(req.body));

  const { user, token } = await authService.login(req.body, req.ip);

  sendSuccess(res, {
    statusCode: 200,
    message: 'Login successful',
    data: { user, token },
  });
});

const me = catchAsync(async (req, res) => {
  sendSuccess(res, {
    statusCode: 200,
    message: 'Authenticated user retrieved',
    data: { user: req.user },
  });
});

module.exports = { register, login, me };
