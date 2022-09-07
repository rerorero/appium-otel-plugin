const { capabilitiesToAttributes } = require('../../lib/telemetry.js');
const chai = require('chai');
const { assert } = chai;

describe('capabilitiesToAttributes', function() {
  it('should filter fields and convert to snake case', function() {
    const caps = {
      'deviceName': 'AndroidEmulator',
      'usePrebuiltWDA': true,
      'version': 12.3,
      'ignoredField': 'shouldNotAppear',
    };
    const expected = {
      'appium.caps.device_name': 'AndroidEmulator',
      'appium.caps.use_prebuilt_wda': true,
      'appium.caps.version': 12.3,
    };
    const target = [
      'deviceName',
      'usePrebuiltWDA',
      'version',
      'extra',
    ];
    const actual = capabilitiesToAttributes(caps, target);
    assert.deepEqual(actual, expected);
  });
});
