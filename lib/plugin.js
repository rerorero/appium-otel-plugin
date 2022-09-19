const { BasePlugin } = require('appium/plugin');
const { tracerDelegatorFactory } = require('./tracer.js');
const { meterDelegatorFactory } = require('./meter.js');


class OpenTelemetryPlugin extends BasePlugin {

  constructor(pluginName) {
    super(pluginName);
    let delegators = [];
    delegators = delegators.concat(
      tracerDelegatorFactory.newDelegators(),
      meterDelegatorFactory.newDelegators(),
    );
    this.delegators = delegators;
  }

  nextWithDelegator(next, funcName, ...args) {
    for (const delegator of this.delegators) {
      next = ((_next) => async () => {
        if (delegator[funcName]) {
          return await delegator[funcName](_next, ...args);
        }
      })(next);
    }
    return next;
  }

  async createSession(next, driver, jwpDesCaps, jwpReqCaps, caps) {
    const doNext = this.nextWithDelegator(next, 'delegateCreateSession', driver, jwpDesCaps, jwpReqCaps, caps);
    return await doNext();
  }

  async deleteSession(next, driver, sessionId) {
    const doNext = this.nextWithDelegator(next, 'delegateDeleteSession', driver, sessionId);
    return await doNext();
  }

  async handle(next, driver, cmdName, ...args) {
    const doNext = this.nextWithDelegator(next, 'delegateHandle', driver, cmdName, ...args);
    return await doNext();
  }

  // eslint-disable-next-line require-await
  async onUnexpectedShutdown(driver, cause) {
    for (const delegator of this.delegators) {
      delegator.delegateOnUnexpectedShutdown(driver, cause);
    }
  }
}

export { OpenTelemetryPlugin };
export default OpenTelemetryPlugin;
