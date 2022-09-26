const { loadAsBool } = require('../../../lib/config');
const chai = require('chai');
const { assert } = chai;

describe('loadAsBool', function () {
  let env;

  before(function () {
    env = process.env;
    process.env = {
      TEST_ENV_1: 'true',
      TEST_ENV_2: 'false',
    };
  });

  after(function () {
    process.env = env;
  });

  it('load', function () {
    assert.isTrue(loadAsBool('TEST_ENV_1', true));
    assert.isFalse(loadAsBool('TEST_ENV_2', true));
    assert.isTrue(loadAsBool('TEST_ENV_1', false));
    assert.isFalse(loadAsBool('TEST_ENV_2', false));
  });

  it('load undefined', function () {
    assert.isTrue(loadAsBool('TEST_ENV_XXXX', true));
    assert.isFalse(loadAsBool('TEST_ENV_XXXX', false));
  });
});
