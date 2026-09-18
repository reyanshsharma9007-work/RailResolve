// source/database/seed.js
// One-shot seed script: run with `npm run seed`. Populates the fixed
// department list, demo trains/stations, default SLA rules, and a single
// bootstrap ADMIN account. Idempotent — safe to run multiple times
// (uses upserts / findOrCreate patterns), per PRD 2.2's "simulated via
// seed data" requirement for train/station master data.

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase, disconnectDatabase } = require('./database');
const logger = require('../utils/logger');

const Department = require('../models/department.model');
const Train = require('../models/train.model');
const Station = require('../models/station.model');
const SlaRule = require('../models/slaRule.model');
const User = require('../models/user.model');

const { DEPARTMENT_CODES, PRIORITY, SLA_TARGET_MINUTES, ROLES } = require('../config/constants');

const DEPARTMENTS_SEED = [
  { code: DEPARTMENT_CODES.TICKET_TTE, name: 'Ticket / TTE', description: 'Reserved seating, ticket verification, and TTE conduct issues.' },
  { code: DEPARTMENT_CODES.STATION_MAINTENANCE, name: 'Station Maintenance', description: 'Platform cleanliness, escalators, waiting halls, and restrooms.' },
  { code: DEPARTMENT_CODES.TRAIN_MAINTENANCE, name: 'Train Maintenance', description: 'AC, electrical, doors, and coach cleanliness inside trains.' },
  { code: DEPARTMENT_CODES.FOOD_WATER, name: 'Food & Water', description: 'Catering quality, overcharging, and water availability.' },
  { code: DEPARTMENT_CODES.TRAIN_OPERATIONS, name: 'Train Operations', description: 'Delays, unannounced halts, and operational safety.' },
  { code: DEPARTMENT_CODES.BOOKING_REFUND, name: 'Booking & Refund', description: 'Booking failures, cancellations, and refund discrepancies.' },
  { code: DEPARTMENT_CODES.GENERAL_SUPPORT, name: 'General Support', description: 'General inquiries, lost & found, and miscellaneous assistance.' },
];

const TRAINS_SEED = [
  { trainNumber: '12951', trainName: 'Mumbai Rajdhani Express' },
  { trainNumber: '12309', trainName: 'Rajendra Nagar Rajdhani Express' },
  { trainNumber: '12621', trainName: 'Tamil Nadu Express' },
  { trainNumber: '12002', trainName: 'Bhopal Shatabdi Express' },
  { trainNumber: '12423', trainName: 'Dibrugarh Rajdhani Express' },
];

const STATIONS_SEED = [
  { code: 'JP', name: 'Jaipur Junction' },
  { code: 'NDLS', name: 'New Delhi' },
  { code: 'MMCT', name: 'Mumbai Central' },
  { code: 'MAS', name: 'Chennai Central' },
  { code: 'HWH', name: 'Howrah Junction' },
  { code: 'BPL', name: 'Bhopal Junction' },
];

async function seedDepartments() {
  for (const dept of DEPARTMENTS_SEED) {
    await Department.findOneAndUpdate({ code: dept.code }, dept, { upsert: true, new: true });
  }
  logger.info(`Seeded ${DEPARTMENTS_SEED.length} departments`);
}

async function seedTrains() {
  for (const train of TRAINS_SEED) {
    await Train.findOneAndUpdate({ trainNumber: train.trainNumber }, train, { upsert: true, new: true });
  }
  logger.info(`Seeded ${TRAINS_SEED.length} trains`);
}

async function seedStations() {
  for (const station of STATIONS_SEED) {
    await Station.findOneAndUpdate({ code: station.code }, station, { upsert: true, new: true });
  }
  logger.info(`Seeded ${STATIONS_SEED.length} stations`);
}

async function seedSlaRules() {
  for (const priority of Object.values(PRIORITY)) {
    await SlaRule.findOneAndUpdate(
      { priority },
      { priority, targetMinutes: SLA_TARGET_MINUTES[priority] },
      { upsert: true, new: true }
    );
  }
  logger.info('Seeded SLA rules for all priority levels');
}

async function seedAdminUser() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@railresolve.local';
  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    logger.info(`Admin user already exists (${adminEmail}), skipping`);
    return;
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await User.hashPassword(adminPassword);

  await User.create({
    name: 'System Administrator',
    email: adminEmail,
    passwordHash,
    role: ROLES.ADMIN,
  });

  logger.info(`Seeded admin user: ${adminEmail} (password: ${adminPassword}) — CHANGE THIS IN PRODUCTION`);
}

async function seed() {
  await connectDatabase();
  try {
    await seedDepartments();
    await seedTrains();
    await seedStations();
    await seedSlaRules();
    await seedAdminUser();
    logger.info('Seeding completed successfully');
  } catch (err) {
    logger.error(`Seeding failed: ${err.message}`, { stack: err.stack });
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
