// utils/helpers.js
const crypto = require('crypto');

exports.generateToken = (id) => {
  return crypto.randomBytes(20).toString('hex');
};

// conversion minutes → ms
exports.minutesToMs = (min) => min * 60 * 1000;
