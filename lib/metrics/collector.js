const { telemetry, capabilitiesToMetricAttributes } = require('../telemetry');

export class SessionMeta {
  constructor(sessionId, caps, createdAt = Date.now()) {
    this.sessionId = sessionId;
    this.caps = caps;
    this.createdAt = createdAt;
  }

  ageMillis() {
    return Date.now() - this.createdAt;
  }
}

class AppiumMeter {
  /**
   * @param {Meter} meter - OTEL metrics meter
   */
  constructor(meter, attributes = {}) {
    this.meter = meter;
    this.attributes = attributes;
    this.initMeter(meter);
  }

  /**
   * @param {Meter} m - OTEL metrics meter
   */
  initMeter(m) {
    this.counterCommandResponses = m.createCounter(telemetry.METRIC_KEY_COMMAND_RESPONSES);
    this.sessionsTotalObservable = m.createObservableGauge(telemetry.METRIC_KEY_SESSION_NUM_TOTAL);
    this.sessionsOldestSessionAgeObservable = m.createObservableGauge(telemetry.METRIC_OLDEST_SESSION_AGE);
  }

  attrWith(...args) {
    return Object.assign({}, this.attributes, ...args);
  }

  countCommandResponsesSuccess(cmdName, attributes = {}) {
    this.countCommandResponses(cmdName, telemetry.METRIC_ATTR_SUCCESS, attributes);
  }
  countCommandResponsesError(cmdName, attributes = {}) {
    this.countCommandResponses(cmdName, telemetry.METRIC_ATTR_ERROR, attributes);
  }
  countCommandResponses(cmdName, stat, attributes) {
    const attr = {
      [telemetry.METRIC_ATTR_COMMAND_NAME]: cmdName,
      [telemetry.METRIC_ATTR_STATUS]: stat,
    };
    this.counterCommandResponses.add(1, this.attrWith(attr, attributes));
  }

  observeTotalSessionGauge(fn, attr = {}) {
    this.sessionsTotalObservable.addCallback(async (res) => {
      res.observe(await fn(), this.attrWith(attr));
    });
  }

  observeOldestSessionAgeGauge(fn, attr = {}) {
    this.sessionsOldestSessionAgeObservable.addCallback(async (res) => {
      res.observe(await fn(), this.attrWith(attr));
    });
  }
}

export class Collector {
  constructor(meter, attributesInCaps, observePeriodMillis, attributes = {}) {
    this.appiumDriver = null;
    this.meter = new AppiumMeter(meter, attributes);
    this.attributesInCaps = attributesInCaps;
    this.sessionMetas = {};
    this.observePeriodMillis = observePeriodMillis;
    this.nowFunc = () => Date.now();

    this.meter.observeTotalSessionGauge(async () => {
      if (!this.appiumDriver) {
        return 0;
      }
      const sessions = await this.appiumDriver.getSessions();
      const currentSessionIDs = sessions.map((s) => s.id);
      this.cleanupSessionMetas(currentSessionIDs);
      return sessions.length;
    });

    // eslint-disable-next-line require-await
    this.meter.observeOldestSessionAgeGauge(async () => this.oldestSessionAge() / 1000);
  }

  putAppiumDriver(driver) {
    if (this.appiumDriver) {
      return;
    }
    this.appiumDriver = driver;
  }

  now() {
    return this.nowFunc();
  }

  onCreateSession(sessionId, caps) {
    this.sessionMetas[sessionId] = new SessionMeta(sessionId, caps, this.now());
  }

  onDeleteSession(sessionId) {
    delete this.sessionMetas[sessionId];
  }

  oldestSessionAge() {
    return Object.entries(this.sessionMetas).reduce((acc, [sessionId, meta]) => {
      if (meta.ageMillis() > acc) {
        return meta.ageMillis();
      }
      return acc;
    }, 0);
  }

  // When a session is terminated other than via the deleteSession command,
  // onDeleteSession() is not invoked and the session keeps staying in this.sessionMetas.
  // cleanupSessionMetas() reconciles with the results of getSessions in obsersve callback
  // to cleanup staled sessions.
  cleanupSessionMetas(currentSessionIDs) {
    // TODO: better algorithm
    const toBeDeleted = Object.keys(this.sessionMetas).reduce((acc, id) => {
      if (!currentSessionIDs.includes(id)) {
        const meta = this.sessionMetas[id];
        if (meta.ageMillis() > (this.observePeriodMillis * 3)) {
          acc.push(id);
        }
      }
      return acc;
    }, []);
    toBeDeleted.map((id) => delete this.sessionMetas[id]);
  }

  countCommandResponsesSuccess(cmdName, caps) {
    const attrs = capabilitiesToMetricAttributes(caps, this.attributesInCaps);
    this.meter.countCommandResponsesSuccess(cmdName, attrs);
  }

  countCommandResponsesError(cmdName, caps) {
    const attrs = capabilitiesToMetricAttributes(caps, this.attributesInCaps);
    this.meter.countCommandResponsesError(cmdName, attrs);
  }
}
