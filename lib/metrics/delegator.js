const { Delegator } = require('../appium');
const { log } = require('../logger');
const { Collector } = require('./collector.js');

/**
 * This class is intended to be instanciated per session basis.
 */
export class MetricsDelegator extends Delegator {

  /**
   * @param {Collector} collector - metrics collector
   */
  constructor(collector) {
    super();
    this.collector = collector;
    this.caps = null;
  }

  /**
   * createSssion command handler
   */
  async delegateCreateSession(next, driver, jwpDesCaps, jwpReqCaps, cap) {
    // Assuming create session is invoked with AppiumDriver.
    if (driver && driver.constructor.name === 'AppiumDriver') {
      this.collector.putAppiumDriver(driver);
    }
    return await next()
      .then((res) => {
        if (!res || !res.value || res.value.length < 2) {
          log.info('skip saving session id');
          return res;
        }

        // First element of the value field is a session ID and 2nd is capabilitiles.
        // https://github.com/appium/appium/blob/12cdbb7fdd7b280a5d0f32d690fb49c9744aa73d/packages/appium/lib/appium.js#L382-L385
        const sessionId = res.value[0];
        this.caps = res.value[1];

        this.collector.onCreateSession(sessionId, this.caps);
        this.collector.countCommandResponsesSuccess('createSession', this.caps);

        return res;
      }).catch((err) => {
        this.collector.countCommandResponsesError('createSession', this.caps);
        throw err;
      });
  }

  async collectCommandMetrics(next, cmdName) {
    return await next()
      .then((res) => {
        this.collector.countCommandResponsesSuccess(cmdName, this.caps);
        return res;
      }).catch((err) => {
        this.collector.countCommandResponsesError(cmdName, this.caps);
        throw err;
      });
  }

  /**
   * deleteSession command handler
   */
  async delegateDeleteSession(next, driver, sessionId) {
    return await this.collectCommandMetrics(next, 'deleteSession')
      .then((res) => {
        this.collector.onDeleteSession(sessionId, this.caps);
        return res;
      });
  }

  /**
   * Appium plugin's handle method
   */
  async delegateHandle(next, driver, cmdName, ...args) {
    return await this.collectCommandMetrics(next, cmdName);
  }
}
