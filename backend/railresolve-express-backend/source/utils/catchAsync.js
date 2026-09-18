// source/utils/catchAsync.js
// Wraps async controller functions so rejected promises are forwarded to
// next(err) automatically, instead of every controller needing its own
// try/catch block.

module.exports = function catchAsync(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
