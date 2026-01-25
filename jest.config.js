module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  moduleFileExtensions: ['js'],
  verbose: true,
  collectCoverageFrom: [
    'content/annotator.js',
    'lib/**/*.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
