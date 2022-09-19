const { MeterProvider, PeriodicExportingMetricReader, InMemoryMetricExporter, AggregationTemporality } = require('@opentelemetry/sdk-metrics');
const { Collector, SessionMeta, MetricsDelegator } = require('../../../lib/metrics');
const { telemetry } = require('../../../lib/telemetry');
import chai from 'chai';
const { assert } = chai;
const should = chai.should();
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;

const sessionId = 'a-123';
const caps = {
  'deviceName': 'dev',
  'app': 'foo.apk',
  'platformName': 'android',
};

class AppiumDriver {
  // eslint-disable-next-line require-await
  async getSessions() {
    return [{
      id: sessionId,
      capabilities: caps,
    }, {
      id: 'b-456',
      capabilities: {
        'deviceName': 'debdeb',
        'app': 'buz.app',
        'platformName': 'iOS',
      },
    }];
  }
}

function extract(collection, name) {
  assert.isAbove(collection.resourceMetrics.scopeMetrics.length, 0);
  const metrics = collection.resourceMetrics.scopeMetrics[0].metrics;
  return metrics.filter((m) => m.descriptor.name === name)
    .flatMap((m) => m.dataPoints.map((d) => d.value));
}

function extractAttributes(collection, name) {
  assert.isAbove(collection.resourceMetrics.scopeMetrics.length, 0);
  const metrics = collection.resourceMetrics.scopeMetrics[0].metrics;
  return metrics.filter((m) => m.descriptor.name === name)
    .flatMap((m) => m.dataPoints.map((d) => d.attributes));
}

describe('Collector', function() {
  let memoryExporter;
  let metricReader;
  let provider;
  let meter;
  let collector;
  let delegator;

  beforeEach(function() {
    provider = new MeterProvider();
    memoryExporter = new InMemoryMetricExporter(AggregationTemporality.DELTA);
    metricReader = new PeriodicExportingMetricReader({ exporter: memoryExporter });
    provider.addMetricReader(metricReader);
    meter = provider.getMeter('test');
    collector = new Collector(meter, ['deviceName', 'app'], 100, { attr1: 'one' });
    delegator = new MetricsDelegator(collector);
    collector.nowFunc = () => Date.now() - 1000; // delay
  });


  describe('Session Observation', function() {
    it('should start observing sessions if createSession is called with AppiumDriver', async function() {
      const driver = new AppiumDriver();
      const result = { 'value': [sessionId, caps] };
      // eslint-disable-next-line require-await
      const next = async () => result;

      const actual = await delegator.delegateCreateSession(next, driver);
      const met = await metricReader.collect();

      should.equal(result, actual);
      should.equal(met.errors.length, 0, met.errors);
      // session totals
      assert.deepEqual([2], extract(met, telemetry.METRIC_KEY_SESSION_NUM_TOTAL));
      // session oldest age
      const ages = extract(met, telemetry.METRIC_OLDEST_SESSION_AGE);
      should.equal(1, ages.length);
      assert.isAbove(ages[0], 999);
    });

    it('should not start observing sessions if createSession is not called', async function() {
      const met = await metricReader.collect();

      should.equal(met.errors.length, 0, met.errors);
      // session totals
      assert.deepEqual([], extract(met, telemetry.METRIC_KEY_SESSION_NUM_TOTAL));
      // session oldest age
      assert.deepEqual([], extract(met, telemetry.METRIC_OLDEST_SESSION_AGE));
    });
  });

  describe('oldestSessionAge', function() {
    it('should return oldest age', function() {
      collector.sessionMetas = {
        x: new SessionMeta('x', {}, Date.now() - 4000),
        y: new SessionMeta('y', {}, Date.now() - 10000), // oldest
        z: new SessionMeta('z', {}, Date.now() - 5000),
      };
      const age = collector.oldestSessionAge();
      assert.isAbove(age, 9990);
      assert.isBelow(age, 10010);
    });

    it('should return zero if no sessions', function() {
      collector.sessionMetas = [];
      should.equal(0, collector.oldestSessionAge());
    });
  });

  describe('Command Observation', function() {
    it('should send metrics for commands', async function() {
      // create session
      // eslint-disable-next-line require-await
      let next = async () => ({ 'value': [sessionId, caps] });
      const driver = new AppiumDriver();
      let result = await delegator.delegateCreateSession(next, driver);
      let met = await metricReader.collect();

      assert.deepEqual({ 'value': [sessionId, caps] }, result);
      should.equal(met.errors.length, 0, met.errors);
      let expectAttr = [{
        attr1: 'one',
        command_name: 'createSession',
        status: 'success',
        device_name: 'dev',
        app: 'foo.apk'
      }];
      assert.deepEqual([1], extract(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));
      assert.deepEqual(expectAttr, extractAttributes(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));

      // command success
      result = await delegator.delegateHandle(
        // eslint-disable-next-line require-await
        async () => 'success',
        { sessionId }, 'cmd1', 'arg1', 'arg2');
      met = await metricReader.collect();
      assert.equal('success', result);
      should.equal(met.errors.length, 0, met.errors);
      expectAttr = [{
        attr1: 'one',
        command_name: 'cmd1',
        status: 'success',
        device_name: 'dev',
        app: 'foo.apk'
      }];
      assert.deepEqual([1], extract(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));
      assert.deepEqual(expectAttr, extractAttributes(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));

      // command failure
      await expect(delegator.delegateHandle(
        // eslint-disable-next-line require-await
        async function next() { throw new Error('err'); },
        { sessionId }, 'cmd2')
      ).to.be.rejectedWith('err');
      met = await metricReader.collect();
      should.equal(met.errors.length, 0, met.errors);
      expectAttr = [{
        attr1: 'one',
        command_name: 'cmd2',
        status: 'error',
        device_name: 'dev',
        app: 'foo.apk'
      }];
      assert.deepEqual([1], extract(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));
      assert.deepEqual(expectAttr, extractAttributes(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));

      // delete session
      result = await delegator.delegateDeleteSession(
        // eslint-disable-next-line require-await
        async () => 'done',
        null, null);
      met = await metricReader.collect();
      should.equal(met.errors.length, 0, met.errors);
      expectAttr = [{
        attr1: 'one',
        command_name: 'deleteSession',
        status: 'success',
        device_name: 'dev',
        app: 'foo.apk'
      }];
      assert.deepEqual([1], extract(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));
      assert.deepEqual(expectAttr, extractAttributes(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));
    });

    it('should send metrics if createSession is failed', async function() {
      const driver = new AppiumDriver();
      // eslint-disable-next-line require-await
      const next = async function() { throw new Error('err'); };

      await expect(delegator.delegateCreateSession(next, driver)).to.be.rejectedWith('err');
      const met = await metricReader.collect();

      should.equal(met.errors.length, 0, met.errors);
      // success
      const expectAttr = [{
        attr1: 'one',
        command_name: 'createSession',
        status: 'error',
      }];
      assert.deepEqual([1], extract(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));
      assert.deepEqual(expectAttr, extractAttributes(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));
    });

    it('should send metrics if non session command is handled', async function() {
      const driver = {}; // non Appium Driver
      const result = await delegator.delegateHandle(
        // eslint-disable-next-line require-await
        async () => 'success',
        driver, 'cmd1', 'arg1', 'arg2');
      const met = await metricReader.collect();

      assert.equal('success', result);
      should.equal(met.errors.length, 0, met.errors);
      const expectAttr = [{
        attr1: 'one',
        command_name: 'cmd1',
        status: 'success',
      }];
      assert.deepEqual([1], extract(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));
      assert.deepEqual(expectAttr, extractAttributes(met, telemetry.METRIC_KEY_COMMAND_RESPONSES));
    });
  });

  describe('cleanupSessionMetas', function() {
    it('should delete stale sessions', function() {
      const a = new SessionMeta('a', {}, Date.now() - 4000);
      const b = new SessionMeta('b', {}, Date.now() - 10000);
      const c = new SessionMeta('c', {}, Date.now() - 5000);
      collector.sessionMetas = { a, b, c };
      collector.cleanupSessionMetas(['a', 'c']);
      assert.deepEqual({ a, c }, collector.sessionMetas);
    });
  });
});
