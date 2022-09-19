const { log } = require('../logger');
const os = require('os');

function load(name, defaults) {
  return process.env[name] ?? defaults;
};

function strToAttributes(s) {
  if (!s) {
    return {};
  }
  return s.split(',')
    .map((e) => e.split('='))
    .reduce((acc, [k, v]) => {
      if (k && v) {
        acc[k] = v;
      } else {
        log.error(`invalid APPIUM_OTEL_ATTRIBUTES format: ${s}`);
      }
      return acc;
    }, {});
}

class Config {
  TRACE_SEMANTIC_COMMAND = 'command';
  TRACE_SEMANTIC_HTTP = 'http';

  TRACE_EXPORTER_CONSOLE = 'console';
  TRACE_EXPORTER_ZIPKIN = 'zipkin';
  TRACE_EXPORTER_OTLP = 'otlp';

  constructor() {
    this.traceEnabled = load('APPIUM_OTEL_TRACE_ENABLED', 'true').toLowerCase() === 'true';
    this.metricsEnabled = load('APPIUM_OTEL_METRICS_ENABLED', 'true').toLowerCase() === 'true';

    this.semantic = load('APPIUM_OTEL_TRACE_SEMANTIC', this.TRACE_SEMANTIC_HTTP);
    this.exporter = load('APPIUM_OTEL_TRACE_EXPORTER', this.TRACE_EXPORTER_OTLP).split(',');

    this.serviceName = load('APPIUM_OTEL_SERVICE_NAME', 'appium');
    this.attributes = strToAttributes(load('APPIUM_OTEL_ATTRIBUTES', ''));
    if (!this.attributes.host) {
      this.attributes.host = load('APPIUM_OTEL_HOSTNAME', os.hostname());
    }
    log.info(`attributes = ${JSON.stringify(this.attributes)}`);

    const defaultAttributesInCaps = 'platformName';
    this.attributesInCaps = load('APPIUM_OTEL_ATTRIBUTES_IN_CAPS', defaultAttributesInCaps).split(',');
    log.info(`attributes in Capabilities = ${JSON.stringify(this.attributesInCaps)}`);

    this.metricsExportIntervalMillis = load('METRICS_EXPORT_INTERVAL_MILLIS', 10000);
    log.info(`metrics export interval = ${this.metricsExportIntervalMillis} ms`);
    this.meterName = load('METER_NAME', 'appium-otel-plugin');

    this.debug = load('DEBUG', 'false').toLowerCase() === 'true';
  }

  isExporterEnabled(exporter) {
    return this.exporter.includes(exporter);
  }
}

export const config = new Config();
