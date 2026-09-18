// source/database/database.js
// Owns the single MongoDB connection for the whole app (Mongoose) plus
// the shared GridFSBucket used for evidence file storage/streaming.

const mongoose = require('mongoose');
const { MongoClient, GridFSBucket } = require('mongodb');
const env = require('../config/env');
const logger = require('../utils/logger');

let gridFsBucket = null;
let mongoClient = null;

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGODB_URI);
  logger.info(`MongoDB connected via Mongoose: ${mongoose.connection.name}`);

  // Native driver client for GridFS (Mongoose doesn't wrap GridFS directly).
  mongoClient = new MongoClient(env.MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db(mongoose.connection.name);
  gridFsBucket = new GridFSBucket(db, { bucketName: 'evidence' });
  logger.info('GridFS bucket "evidence" initialized');

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  return { mongoose, gridFsBucket };
}

function getGridFsBucket() {
  if (!gridFsBucket) {
    throw new Error('GridFS bucket accessed before database connection was established');
  }
  return gridFsBucket;
}

async function disconnectDatabase() {
  if (mongoClient) await mongoClient.close();
  await mongoose.disconnect();
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getGridFsBucket,
};
