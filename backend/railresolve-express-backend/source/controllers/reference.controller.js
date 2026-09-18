// source/controllers/reference.controller.js
// Public (auth-only) read endpoints for simulated master data used to
// populate frontend dropdowns: trains, stations, and active departments
// with their permitted categories.

const catchAsync = require('../utils/catchAsync');
const { sendSuccess } = require('../utils/apiResponse');
const Train = require('../models/train.model');
const Station = require('../models/station.model');
const Department = require('../models/department.model');
const { DEPARTMENT_CATEGORIES } = require('../config/constants');

const listTrains = catchAsync(async (req, res) => {
  const trains = await Train.find({ isActive: true }).sort({ trainNumber: 1 });
  sendSuccess(res, { statusCode: 200, message: 'Trains retrieved successfully', data: { trains } });
});

const listStations = catchAsync(async (req, res) => {
  const stations = await Station.find({ isActive: true }).sort({ name: 1 });
  sendSuccess(res, { statusCode: 200, message: 'Stations retrieved successfully', data: { stations } });
});

const listDepartmentsWithCategories = catchAsync(async (req, res) => {
  const departments = await Department.find({ isActive: true }).sort({ name: 1 });
  const enriched = departments.map((dept) => ({
    ...dept.toObject(),
    permittedCategories: DEPARTMENT_CATEGORIES[dept.code] || [],
  }));

  sendSuccess(res, { statusCode: 200, message: 'Departments retrieved successfully', data: { departments: enriched } });
});

module.exports = { listTrains, listStations, listDepartmentsWithCategories };
