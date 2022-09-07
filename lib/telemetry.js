const telemetry = new function() {
  this.ATTR_PREFIX = 'appium.';
  this.ATTR_CAPS_PREFIX = `${this.ATTR_PREFIX}caps.`;
  this.ATTR_SESSION_ID = `${this.ATTR_PREFIX}session.id`;
};

function toSnakeCase(s) {
  return s && s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map((x) => x.toLowerCase())
    .join('_');
}

function capabilitiesToAttributes(cap, targets) {
  return targets.reduce((acc, v) => {
    if (cap[v]) {
      acc[`${telemetry.ATTR_CAPS_PREFIX}${toSnakeCase(v)}`] = cap[v];
    }
    return acc;
  }, {});
}

export { telemetry, capabilitiesToAttributes };
