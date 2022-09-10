const { BasePlugin } = require('appium/plugin');
const { config } = require('./config');
const { provider, semantic } = require('./tracer.js');

const tracer = provider.getTracer(config.serviceName);
const delegators = [semantic.newDelegater(config, tracer)];

class OpenTelemetryPlugin extends BasePlugin {

  constructor(pluginName) {
    super(pluginName);
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

  async onUnexpectedShutdown(driver, cause) {
    await this.delegator.delegateOnUnexpectedShutdown(driver, cause);
  }
}

export { OpenTelemetryPlugin };
export default OpenTelemetryPlugin;
