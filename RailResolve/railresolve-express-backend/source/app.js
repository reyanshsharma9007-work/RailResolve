// source/app.js
// Builds and configures the Express application: global middleware,
// router mounting, and the terminal 404/error handlers. Exported (not
// started) so server.js and test suites can both import the same app.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');

const env = require('./config/env');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { sendSuccess } = require('./utils/apiResponse');

const authRoutes = require('./routers/auth.routes');
const journeyRoutes = require('./routers/journey.routes');
const complaintRoutes = require('./routers/complaint.routes');
const attachmentRoutes = require('./routers/attachment.routes');
const notificationRoutes = require('./routers/notification.routes');
const adminRoutes = require('./routers/admin.routes');
const referenceRoutes = require('./routers/reference.routes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

app.use(
  morgan(env.isProduction() ? 'combined' : 'dev', {
    stream: { write: (message) => logger.http?.(message.trim()) || logger.info(message.trim()) },
  })
);

app.get('/health', (_req, res) => {
  sendSuccess(res, { statusCode: 200, message: 'RailResolve Express API is healthy', data: { uptime: process.uptime() } });
});

app.use('/api/auth', authRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reference', referenceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
