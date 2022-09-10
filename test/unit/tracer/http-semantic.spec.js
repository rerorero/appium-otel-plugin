const http = require('http');
const {
  extractSessionIdFromUrl,
  newHttpInstrumantationConfig,
  Shared,
  SessionData,
  HTTPTracerDelegator,
} = require('../../../lib/trace/http-semantic');
const {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  BasicTracerProvider,
} = require('@opentelemetry/sdk-trace-base');
const sinon = require('sinon');
import chai from 'chai';
const should = chai.should();

describe('extractSessionIdFromUrl', function() {
  it('should extract session id', function() {
    const cases = {
      'abc-cde-1': '/session/abc-cde-1',
      'abc-cde-2': '/wb/session/abc-cde-2',
      'abc-cde-3': '/session/abc-cde-3/',
      'abc-cde-4': '/wb/session/abc-cde-4/',
      'abc-cde-5': '/session/abc-cde-5/foo/bar',
      'abc-cde-6': '/wb/session/abc-cde-6/foo/bar/',
    };
    Object.keys(cases).map((id) => {
      extractSessionIdFromUrl(cases[id]).should.equal(id);
    });
  });

  it('should return null', function() {
    const cases = [
      '/session',
      '/wb/session',
      '/session/',
      '/wb/session/',
      '/ssession/abc-cde-5/foo/bar',
      '/wb/abc-cde-6/foo/session/',
    ];
    cases.map((url) => should.not.exist(extractSessionIdFromUrl(url)));
  });
});

function newIncomingMessage(method, url) {
  const m = new http.IncomingMessage(null);
  m.url = url;
  m.method = method;
  return m;
}

describe('HttpInstrumentation', function() {
  let memoryExporter;
  let provider;
  let span;
  let shared;
  let sut;

  const sessionId = 'a-123';
  const createSessionReq = newIncomingMessage('POST', '/session');
  const deleteSessionReq = newIncomingMessage('DELETE', `/session/${sessionId}`);
  const pageSourceReq = newIncomingMessage('GET', `/wd/session/${sessionId}/source`);
  const noSessionReq = newIncomingMessage('GET', '/sessions');
  const response = new http.ServerResponse(noSessionReq);

  beforeEach(function() {
    memoryExporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider();
    provider.addSpanProcessor(new SimpleSpanProcessor(memoryExporter));
    span = provider.getTracer('default').startSpan('root');
    shared = new Shared();
    sut = newHttpInstrumantationConfig(shared);
  });

  describe('requestHook', function() {
    it('should put span if createSession request', function() {
      sut.requestHook(span, createSessionReq);
      should.exist(shared.lastCreateSessionSpan);
    });

    it('should not put span if not a createSession request', function() {
      sut.requestHook(span, pageSourceReq);
      should.not.exist(shared.lastCreateSessionSpan);
    });
  });

  describe('applyCustomAttributesOnSpan', function() {
    it('should bind attributes to span', function() {
      shared.addSession(sessionId, new SessionData({ a: 'a' }));
      const mock = sinon.mock(span);
      mock.expects('setAttributes').once().withArgs({ a: 'a' });
      sut.applyCustomAttributesOnSpan(span, pageSourceReq, response);
      should.exist(shared.getSessionData(sessionId));
    });

    it('should do nothing if session data is not found', function() {
      const mock = sinon.mock(span);
      mock.expects('setAttributes').never();
      sut.applyCustomAttributesOnSpan(span, pageSourceReq, response);
    });

    it('should do nothing if not a session command', function() {
      const mock = sinon.mock(span);
      mock.expects('setAttributes').never();
      sut.applyCustomAttributesOnSpan(span, createSessionReq, response);
    });

    it('should delete session data if delete session request', function() {
      shared.addSession(sessionId, new SessionData({ a: 'a' }));
      const mock = sinon.mock(span);
      mock.expects('setAttributes').once().withArgs({ a: 'a' });
      sut.applyCustomAttributesOnSpan(span, deleteSessionReq, response);
      should.not.exist(shared.getSessionData(sessionId));
    });
  });
});

describe('HTTPTracerDelegator', function() {
  let memoryExporter;
  let provider;
  let span;
  let shared;
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
    span = provider.getTracer('default').startSpan('root');
    shared = new Shared();
    sut = new HTTPTracerDelegator(['deviceName', 'app'], shared);
  });

  describe('delegateCreateSession', function() {
    it('should bind attributes to the last createSession span', async function() {
      const result = {'value': [sessionId, caps]};
      const mock = sinon.mock(span);
      mock.expects('setAttributes').once().withArgs({
        'appium.caps.device_name': 'dev',
        'appium.caps.app': 'foo.apk',
        'appium.session.id': sessionId,
      });
      shared.putLastSessionSpan(span);
      const actual = await sut.delegateCreateSession(() => result, null, null, null, null);
      should.equal(result, actual);
    });
  });
});
