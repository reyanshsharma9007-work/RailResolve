const test = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';
const { validateTicketUpload } = require('../source/services/ticket-upload.service');

test('ticket upload accepts matching PDF signature', () => {
  assert.equal(validateTicketUpload({ mimetype: 'application/pdf', size: 100, buffer: Buffer.from('%PDF-1.7') }), true);
});

test('ticket upload rejects spoofed MIME/signature', () => {
  assert.throws(() => validateTicketUpload({ mimetype: 'application/pdf', size: 100, buffer: Buffer.from('not-a-pdf') }), /Uploaded file content/);
});

test('ticket upload accepts matching PNG signature', () => {
  const png = Buffer.from([137,80,78,71,13,10,26,10,0]);
  assert.equal(validateTicketUpload({ mimetype: 'image/png', size: png.length, buffer: png }), true);
});

test('ticket upload rejects an oversized image', () => {
  const jpeg = Buffer.from([0xff,0xd8,0xff,0x00]);
  assert.throws(
    () => validateTicketUpload({ mimetype: 'image/jpeg', size: 11, buffer: jpeg }, { maxImageBytes: 10 }),
    /exceeds the maximum/
  );
});
