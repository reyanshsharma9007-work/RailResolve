// source/routers/reference.routes.js
const express = require('express');
const referenceController = require('../controllers/reference.controller');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/trains', referenceController.listTrains);
router.get('/stations', referenceController.listStations);
router.get('/departments', referenceController.listDepartmentsWithCategories);

module.exports = router;
