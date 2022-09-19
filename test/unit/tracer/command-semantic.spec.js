const { CommandTracerDelegator, } = require('../../../lib/trace/command-semantic');
const {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  BasicTracerProvider,
} = require('@opentelemetry/sdk-trace-base');
const { SpanStatusCode } = require('@opentelemetry/api');
import chai from 'chai';
const should = chai.should();
const { assert } = chai;
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;


describe('CommandTracerDelegator', function() {
  let memoryExporter;
  let provider;
  let tracer;
  let sut;
  const sessionId = 'a-123';
  const caps = {
    'deviceName': 'dev',
    'app': 'foo.apk',
    'platformName': 'android',
  };

  beforeEach(function() {
    memoryExporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider();
    provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
    tracer = provider.getTracer('default');
    sut = new CommandTracerDelegator(tracer, ['deviceName', 'app'], {attr1: 'one'});
  });


  it('should put spans when receiving command', async function() {
    // create session
    // eslint-disable-next-line require-await
    let next = async () => ({ value: [sessionId, caps] });
    let res = await sut.delegateCreateSession(next, null, null, null, null);
    assert.deepEqual(res, { value: [sessionId, caps] });

    // command success
    res = await sut.delegateHandle(
      // eslint-disable-next-line require-await
      async () => 'success',
      { sessionId }, 'cmd1', 'arg1', 'arg2');
    assert.deepEqual(res, 'success');

    // command failure
    await expect(
      sut.delegateHandle(
        // eslint-disable-next-line require-await
        async function() { throw new Error('err'); },
        { sessionId }, 'cmd2')
    ).to.be.rejectedWith('err');

    // non session command
    res = await sut.delegateHandle(
      // eslint-disable-next-line require-await
      async () => 'success',
      {}, 'cmd3', 'arg1');
    assert.deepEqual(res, 'success');

    // delete session
    res = await sut.delegateDeleteSession(
      // eslint-disable-next-line require-await
      async () => 'done',
      null, null);
    assert.deepEqual(res, 'done');

    const spans = memoryExporter.getFinishedSpans();
    should.equal(6, spans.length);
    const expectedAttr = {
      attr1: 'one',
      ['appium.caps.app']: 'foo.apk',
      ['appium.caps.device_name']: 'dev',
      ['appium.session.id']: sessionId,
    };
    const expected = [
      { name: 'createSession', attr: expectedAttr, status: { code: SpanStatusCode.OK } },
      { name: 'cmd1', attr: expectedAttr, status: { code: SpanStatusCode.OK } },
      { name: 'cmd2', attr: expectedAttr, status: { code: SpanStatusCode.ERROR, message: 'Error: err' } },
      { name: 'cmd3', attr: expectedAttr, status: { code: SpanStatusCode.OK } },
      { name: 'deleteSession', attr: expectedAttr, status: { code: SpanStatusCode.OK } },
      { name: 'session', attr: expectedAttr, status: { code: SpanStatusCode.UNSET } },
    ];
    expected.forEach((e, i) => {
      assert.deepEqual(e.name, spans[i].name);
      assert.deepEqual(e.attr, spans[i].attributes);
      assert.deepEqual(e.status, spans[i].status);
    });
  });
});
