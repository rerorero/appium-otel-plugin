const telemetry = new function() {
  this.ATTR_PREFIX = 'appium.';
  this.ATTR_CAPS_PREFIX = `${this.ATTR_PREFIX}caps.`;
  this.ATTR_SESSION_ID = `${this.ATTR_PREFIX}session.id`;

  this.METRIC_ATTR_COMMAND_NAME = 'command';
  this.METRIC_ATTR_STATUS = 'status';
  this.METRIC_ATTR_SUCCESS = 'success';
  this.METRIC_ATTR_ERROR = 'error';
  this.METRIC_KEY_PREFIX = 'appium.';
  this.METRIC_KEY_COMMAND_RESPONSES = `${this.METRIC_KEY_PREFIX}command.responses`;
  this.METRIC_KEY_SESSION_NUM_TOTAL = `${this.METRIC_KEY_PREFIX}sessions.total`;
  this.METRIC_OLDEST_SESSION_AGE = `${this.METRIC_KEY_PREFIX}sessions.oldest_age`;
};

function toSnakeCase(s) {
  return s && s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join('_');
}

function capabilitiesToAttributes(cap, targets) {
  if (!cap) {
    return {};
  }
  return targets.reduce((acc, v) => {
    if (cap[v]) {
      acc[`${telemetry.ATTR_CAPS_PREFIX}${toSnakeCase(v)}`] = cap[v];
    }
    return acc;
  }, {});
}

function capabilitiesToMetricAttributes(cap, targets) {
  if (!cap) {
    return {};
  }
  return targets.reduce((acc, v) => {
    if (cap[v]) {
      const key = toSnakeCase(v);
      acc[key] = cap[v];
    }
    return acc;
  }, {});
}

export { telemetry, capabilitiesToAttributes, capabilitiesToMetricAttributes };
