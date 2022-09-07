const { BasePlugin } = require('appium/plugin');
const { config, semantic } = require('./config.js');
const { provider } = require('./tracer.js');

const tracer = provider.getTracer(config.serviceName);

class OpenTelemetryPlugin extends BasePlugin {

  constructor(pluginName) {
    super(pluginName);
    this.delegator = semantic.newDelegater(config, tracer);
  }

  async createSession(next, driver, jwpDesCaps, jwpReqCaps, caps) {
    return await this.delegator.delegateCreateSession(next, driver, jwpDesCaps, jwpReqCaps, caps);
  }

  async deleteSession(next, driver, sessionId) {
    return await this.delegator.delegateDeleteSession(next, driver, sessionId);
  }

  async handle(next, driver, cmdName, ...args) {
    return await this.delegator.delegateHandle(next, driver, cmdName, ...args);
  }

  async onUnexpectedShutdown(driver, cause) {
    await this.delegator.delegateOnUnexpectedShutdown(driver, cause);
  }
}

export { OpenTelemetryPlugin };
export default OpenTelemetryPlugin;
