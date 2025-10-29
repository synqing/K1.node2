module.exports = () => ({
  // Use automatic configuration for Vitest. Wallaby will detect vitest/vite.
  autoDetect: true,
  // Treat console.error in tests/app code as failures to surface issues fast.
  reportConsoleErrorAsError: true,
});