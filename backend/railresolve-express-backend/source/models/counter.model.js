// source/models/counter.model.js
// Generic atomic counter collection, used to generate sequential,
// collision-free reference numbers (e.g. complaint reference numbers).

const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
