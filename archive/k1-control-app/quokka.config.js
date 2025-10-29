module.exports = {
  // Ensure Quokka respects project TypeScript configuration and path aliases.
  tsConfig: './tsconfig.json',
  // Include source files for type resolution during scratch runs.
  files: [
    'src/**/*.ts',
    'src/**/*.tsx'
  ],
};