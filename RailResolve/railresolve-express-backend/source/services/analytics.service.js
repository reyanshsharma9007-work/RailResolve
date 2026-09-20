// source/services/analytics.service.js
// Read-only aggregation queries backing GET /api/admin/analytics.
// Deliberately kept separate from admin.controller.js so the aggregation
// pipelines can be unit-tested and reused (e.g. by a future officer-level
// department analytics view) without duplicating logic.

const Complaint = require('../models/complaint.model');
const { COMPLAINT_STATUS } = require('../config/constants');

async function getDepartmentWorkloadSummary() {
  return Complaint.aggregate([
    {
      $group: {
        _id: { departmentId: '$departmentId', status: '$status' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.departmentId',
        statusBreakdown: { $push: { status: '$_id.status', count: '$count' } },
        totalComplaints: { $sum: '$count' },
      },
    },
    {
      $lookup: {
        from: 'departments',
        localField: '_id',
        foreignField: '_id',
        as: 'department',
      },
    },
    { $unwind: '$department' },
    {
      $project: {
        _id: 0,
        departmentId: '$_id',
        departmentName: '$department.name',
        departmentCode: '$department.code',
        totalComplaints: 1,
        statusBreakdown: 1,
      },
    },
  ]);
}

async function getSlaBreachRate() {
  const [result] = await Complaint.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        breached: { $sum: { $cond: ['$sla.overdue', 1, 0] } },
      },
    },
  ]);

  if (!result || result.total === 0) {
    return { total: 0, breached: 0, breachRatePercent: 0 };
  }

  return {
    total: result.total,
    breached: result.breached,
    breachRatePercent: Number(((result.breached / result.total) * 100).toFixed(2)),
  };
}

async function getAverageResolutionTimeHours() {
  const [result] = await Complaint.aggregate([
    { $match: { status: { $in: [COMPLAINT_STATUS.RESOLVED, COMPLAINT_STATUS.CLOSED] }, resolvedAt: { $ne: null } } },
    {
      $project: {
        resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] },
      },
    },
    {
      $group: {
        _id: null,
        avgResolutionMs: { $avg: '$resolutionMs' },
        sampleSize: { $sum: 1 },
      },
    },
  ]);

  if (!result) {
    return { averageResolutionHours: 0, sampleSize: 0 };
  }

  return {
    averageResolutionHours: Number((result.avgResolutionMs / (1000 * 60 * 60)).toFixed(2)),
    sampleSize: result.sampleSize,
  };
}

async function getFeedbackSummary() {
  const Feedback = require('../models/feedback.model');
  const [result] = await Feedback.aggregate([
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalFeedback: { $sum: 1 },
      },
    },
  ]);

  if (!result) {
    return { averageRating: 0, totalFeedback: 0 };
  }

  return {
    averageRating: Number(result.averageRating.toFixed(2)),
    totalFeedback: result.totalFeedback,
  };
}

async function getAnalyticsOverview() {
  const [departmentWorkload, slaBreach, resolutionTime, feedback] = await Promise.all([
    getDepartmentWorkloadSummary(),
    getSlaBreachRate(),
    getAverageResolutionTimeHours(),
    getFeedbackSummary(),
  ]);

  return { departmentWorkload, slaBreach, resolutionTime, feedback };
}

module.exports = {
  getDepartmentWorkloadSummary,
  getSlaBreachRate,
  getAverageResolutionTimeHours,
  getFeedbackSummary,
  getAnalyticsOverview,
};
