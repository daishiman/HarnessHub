"use strict";

// pad is an inward tolerance, in mm. Shared by input and measured-layout checks.
function overlap(a, b, pad = 0) {
  return (
    a.x + pad < b.x + b.w &&
    a.x + a.w - pad > b.x &&
    a.y + pad < b.y + b.h &&
    a.y + a.h - pad > b.y
  );
}

function inBox(a, b, tolerance = 0.2) {
  return (
    a.x >= b.x - tolerance &&
    a.y >= b.y - tolerance &&
    a.x + a.w <= b.x + b.w + tolerance &&
    a.y + a.h <= b.y + b.h + tolerance
  );
}

module.exports = { overlap, inBox };
