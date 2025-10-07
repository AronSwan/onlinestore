/**
 * CommonJS mock for 'uuid' to be used in Jest tests.
 * This avoids parsing ESM from node_modules and keeps transform scope minimal.
 * Generates deterministic but unique IDs per call to avoid collisions in tests.
 */
let __uuidCounter = 0;
module.exports = {
  v4: function () {
    __uuidCounter += 1;
    const suffix = String(__uuidCounter).padStart(12, '0');
    // Format a pseudo-UUID with stable prefix and incrementing suffix
    return `00000000-0000-4000-8000-${suffix}`;
  },
};
