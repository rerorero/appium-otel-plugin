const { context, trace, SpanStatusCode, Tracer } = require('@opentelemetry/api');
const { telemetry, capabilitiesToAttributes } = require('../telemetry');
const { Semantic } = require('./semantic.js');
const { Delegator } = require('../appium');
const { log } = require('../logger');

/**
 * This class is intended to be instanciated per session basis.
 */
class CommandTracerDelegator extends Delegator {

  /**
   * @param {Tracer} tracer - OpenTelemetry tracer
   * @param {Array<string>} attributesInCaps - List of cap names to be assigned to attributes.
   */
  constructor(tracer, attributesInCaps, attributes = {}) {
    super();
    this.tracer = tracer;
    this.attributesInCaps = attributesInCaps;
    this.ctx = null;
    this.sessionSpan = null;
    this.baseAttributes = attributes;
    this.commonAttributes = attributes;
  }

  finishSessionSpan() {
    if (this.sessionSpan) {
      this.sessionSpan.end();
    }
    this.sessionSpan = null;
    this.ctx = null;
    this.commonAttributes = this.baseAttributes;
  }

  /**
   * createSssion command handler
   */
  async delegateCreateSession(next, driver, jwpDesCaps, jwpReqCaps, cap) {
    this.sessionSpan = this.tracer.startSpan('session');
    this.ctx = trace.setSpan(context.active(), this.sessionSpan);

    return await context.with(this.ctx, async () => {
      const cmdSpan = this.tracer.startSpan('createSession');
      return await next()
        .then((res) => {
          if (!res || !res.value || res.value.length < 2) {
            log.info('skip saving session id');
            return res;
          }

          // First element of the value field is a session ID and 2nd is capabilitiles.
          // https://github.com/appium/appium/blob/12cdbb7fdd7b280a5d0f32d690fb49c9744aa73d/packages/appium/lib/appium.js#L382-L385
          const sessionId = res.value[0];
          const caps = res.value[1];
          const capAttrs = capabilitiesToAttributes(caps, this.attributesInCaps);

          this.commonAttributes = Object.assign({}, this.commonAttributes, capAttrs, { [telemetry.ATTR_SESSION_ID]: sessionId });

          this.sessionSpan.setAttributes(this.commonAttributes);
          cmdSpan.setAttributes(this.commonAttributes);

          cmdSpan.setStatus({ code: SpanStatusCode.OK });
          cmdSpan.end();

          return res;

        }).catch((err) => {
          cmdSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.toString() });
          cmdSpan.end();
          this.finishSessionSpan();
          throw err;
        });
    });
  }

  async commandWithSessionSpan(next, cmdName) {
    if (!this.sessionSpan || !this.ctx) {
      log.debug(`session span is not found: cmdName=${cmdName}`);
      return await next();
    }

    return await context.with(this.ctx, async () => {
      const cmdSpan = this.tracer.startSpan(cmdName, { attributes: this.commonAttributes });
      return await next()
        .then((res) => {
          cmdSpan.setStatus({ code: SpanStatusCode.OK });
          cmdSpan.end();
          return res;
        }).catch((err) => {
          cmdSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.toString() });
          cmdSpan.end();
          throw err;
        });
    });
  }

  /**
   * deleteSession command handler
   */
  async delegateDeleteSession(next, driver, sessionId) {
    return await this.commandWithSessionSpan(next, 'deleteSession', sessionId)
      .then((res) => {
        this.finishSessionSpan();
        return res;
      });
  }

  /**
   * Appium plugin's handle method
   */
  async delegateHandle(next, driver, cmdName, ...args) {
    return await this.commandWithSessionSpan(next, cmdName, driver.sessionId);
  }

  // eslint-disable-next-line require-await
  async delegateOnUnexpectedShutdown(driver, cause) {
    this.finishSessionSpan();
  }
}

class CommandSemantic extends Semantic {
  constructor(attributesInCaps, attributes) {
    super();
    this.attributesInCaps = attributesInCaps;
    this.attributes = attributes;
  }

  newDelegater(tracer) {
    return new CommandTracerDelegator(tracer, this.attributesInCaps, this.attributes);
  };

  instrumentations() {
    return [];
  }
}

export { CommandSemantic, CommandTracerDelegator };
