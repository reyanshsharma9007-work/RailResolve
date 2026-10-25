// source/models/department.model.js
// Fixed set of operational departments a passenger manually chooses from.
// Seeded once; admins can rename/deactivate but the `code` enum itself is
// fixed by DEPARTMENT_CODE_VALUES in config/constants.js.

const mongoose = require('mongoose');
const { DEPARTMENT_CODE_VALUES } = require('../config/constants');

const departmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: DEPARTMENT_CODE_VALUES,
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
