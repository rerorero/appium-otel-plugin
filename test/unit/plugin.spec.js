const { Delegator } = require('../../lib/semantic.js');
const { OpenTelemetryPlugin } = require('../../lib/plugin.js');
import chai from 'chai';
const should = chai.should();
const { assert } = chai;


class FakeDelegator extends Delegator {
  constructor(id, actions) {
    super();
    this.id = id;
    this.actions = actions;
  }

  async delegateHandle(next, driver, cmdName, ...args) {
    this.actions.push(`${this.id}: ${cmdName} start`);
    const res = await next();
    this.actions.push(`${this.id}: ${cmdName} res=${res}`);
    return res;
  }
}

describe('OpenTelemetryPlugin', function() {
  it('should delegate command handler', async function() {
    const actions = [];
    const delegators = [
      new FakeDelegator(1, actions),
      new FakeDelegator(2, actions),
    ]
    const next = async () => { 
      actions.push('next');
      return 'meow';
    };

    const plugin = new OpenTelemetryPlugin('test');
    plugin.delegators = delegators;
    const result = await plugin.handle(next, null, 'dummy', 'arg');
    should.equal(result, 'meow');
    assert.deepEqual(actions, [
      '2: dummy start',
      '1: dummy start',
      'next',
      '1: dummy res=meow',
      '2: dummy res=meow',
    ]);
  });
});
