// source/models/attachment.model.js
// Metadata pointer to a file stored in the GridFS "evidence" bucket.
// The binary itself never lives in this document — only gridFsFileId
// references it. storageFilename is an internally generated UUID name
// (never the original client filename) to prevent path-traversal / collisions.

const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gridFsFileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    storageFilename: { type: String, required: true },
    originalFilename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    storageType: { type: String, default: 'gridfs' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attachment', attachmentSchema);
