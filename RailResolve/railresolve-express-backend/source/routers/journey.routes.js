// source/routers/journey.routes.js
const express = require('express');
const journeyController = require('../controllers/journey.controller');
const authenticate = require('../middleware/auth.middleware');
const requireRole = require('../middleware/rbac.middleware');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(authenticate, requireRole(ROLES.PASSENGER));

router.post('/', journeyController.createJourney);
router.get('/', journeyController.listMyJourneys);
router.get('/:id', journeyController.getJourneyById);

module.exports = router;
