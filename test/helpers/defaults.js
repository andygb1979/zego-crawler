const defaultConfig = require('../../src/config/default.json');
const fixtures = require('../fixtures/defaults.json');

module.exports = {
  config: defaultConfig,
  urls: fixtures.urls,
  contentTypes: fixtures.contentTypes,
  cli: fixtures.cli,
};
