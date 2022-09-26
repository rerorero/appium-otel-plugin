const http = require('http');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { Delegator } = require('../appium');
const { Semantic } = require('./semantic.js');
const { telemetry, capabilitiesToAttributes } = require('../telemetry');
const { log } = require('../logger');

const SESSIONID_RE = /\/session\/([^/\s]+)/;
const SESSION_CREATE_URL_RE = /\/session$/;
const SESSION_DELETE_URL_RE = /\/session\/([^/\s]+)$/;


/**
 * Extract session ID from URL
 * @param {string} url - URL string
 */
function extractSessionIdFromUrl(url) {
  const m = url.match(SESSIONID_RE);
  if (!m || m.length !== 2) {
    return null;
  }
  return m[1];
}

/**
 * Returns if a given request is create session request.
 * @param {boolean}
 */
function isCreateSessionRequest(req) {
  if (!(req instanceof http.IncomingMessage)) {
    return false;
  }
  if (!SESSION_CREATE_URL_RE.test(req.url)) {
    return false;
  }
  if (req.method !== 'POST') {
    return false;
  }
  return true;
}

/**
 * Returns if a given request is delete session request.
 * @param {boolean}
 */
function isDeleteSessionRequest(req) {
  if (!(req instanceof http.IncomingMessage)) {
    return false;
  }
  if (!SESSION_DELETE_URL_RE.test(req.url)) {
    return false;
  }
  if (req.method !== 'DELETE') {
    return false;
  }
  return true;
}

class SessionData {
  /**
   * @param {Object} attributes - span attributes bound to requests associated with the session.
   */
  constructor(attributes) {
    this.attributes = attributes;
  }

  getAttributes() {
    return this.attributes;
  }
}

/**
 * Shared class instance is used as a shared memory for
 * communication between HTTPSemanticDelegaotr and instruments hooks.
 */
class Shared {

  constructor(attributes = {}) {
    this.sessionDataStore = {};
    this.lastCreateSessionSpan = null;
    this.attributes = attributes;
  }

  getSessionData(sessionId) {
    return this.sessionDataStore[sessionId];
  }

  putLastSessionSpan(span) {
    this.lastCreateSessionSpan = span;
  }

  /**
   * Bind stored associated session attributes to the span.
   */
  bindSessionAttributesToSpan(span, sessionId) {
    if (!sessionId) {
      return;
    }
    const data = this.getSessionData(sessionId);
    if (!data) {
      log.info(`session information not found for session id: ${sessionId}.`);
      return;
    }

    const attr = Object.assign({}, this.attributes, data.getAttributes());
    span.setAttributes(attr);
  }

  /**
   * lastCreateSessionSpan is the span of the most recent create session request.
   * which is set by the instruments hook.
   * The session id cannot be obtained until after the create session command has been processed.
   * lastCreateSessionSpan is a workaround to give the session id to the span of the create session request as well.
   */
  addSession(sessionId, data) {
    this.sessionDataStore[sessionId] = data;
    if (this.lastCreateSessionSpan) {
      this.bindSessionAttributesToSpan(this.lastCreateSessionSpan, sessionId);
      this.lastCreateSessionSpan = null;
    }
  }

  deleteSessionData(sessionId) {
    delete this.sessionDataStore[sessionId];
  }
}

/**
 * This class is intended to be instanciated per session basis.
 */
class HTTPTracerDelegator extends Delegator {

  constructor(attributesInCaps, sharedInstance) {
    super();
    this.attributesInCaps = attributesInCaps;
    this.shared = sharedInstance;
  }

  /**
   * createSession command handler
   */
  async delegateCreateSession(next, driver, jwpDesCaps, jwpReqCaps, caps) {
    const res = await next();

    if (!res || !res.value || res.value.length < 2) {
      log.info('skip saving session Id');
      return res;
    }

    // First element of the value field is a session ID and 2nd is capabilitiles.
    // https://github.com/appium/appium/blob/12cdbb7fdd7b280a5d0f32d690fb49c9744aa73d/packages/appium/lib/appium.js#L382-L385
    const sessionId = res.value[0];
    const capabilities = res.value[1];

    const capAttrs = capabilitiesToAttributes(capabilities, this.attributesInCaps);
    const sessionAttributes = Object.assign({}, capAttrs, { [telemetry.ATTR_SESSION_ID]: sessionId });

    this.shared.addSession(sessionId, new SessionData(sessionAttributes));

    return res;
  }
}

function newHttpInstrumantationConfig(sharedInstance) {
  return {
    /** Function for adding custom attributes after response is handled */
    applyCustomAttributesOnSpan: (span, req, res) => {
      // Currently, it only handles incoming requests.
      if (req instanceof http.IncomingMessage && res instanceof http.ServerResponse) {

        const sessionId = extractSessionIdFromUrl(req.url);
        if (!sessionId) {
          return;
        }

        // bind associated session information to span.
        sharedInstance.bindSessionAttributesToSpan(span, sessionId);

        if (isDeleteSessionRequest(req)) {
          sharedInstance.deleteSessionData(sessionId);
        }
      }
    },

    /** Function for adding custom attributes before request is handled */
    requestHook: (span, req) => {
      if (isCreateSessionRequest(req)) {
        sharedInstance.putLastSessionSpan(span);
      }
    },

    requireParentforIncomingSpans: false,
    requireParentforOutgoingSpans: false,
  };
}

class HTTPSemantic extends Semantic {

  constructor(attributesInCaps, attributes) {
    super();
    this.attributesInCaps = attributesInCaps;
    this.shared = new Shared(attributes);
  }

  newDelegater(tracer) {
    return new HTTPTracerDelegator(this.attributesInCaps, this.shared);
  };

  instrumentations() {
    return [
      new ExpressInstrumentation(),
      new HttpInstrumentation(newHttpInstrumantationConfig(this.shard)),
    ];
  }
}

export { HTTPSemantic, newHttpInstrumantationConfig, HTTPTracerDelegator, extractSessionIdFromUrl, Shared, SessionData };
