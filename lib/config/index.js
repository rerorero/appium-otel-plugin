const { log } = require('../logger');
const os = require('os');

function load(name, defaults) {
  return process.env[name] ?? defaults;
};

export function loadAsBool(name, defaults) {
  return load(name, defaults.toString()).toLowerCase() === 'true';
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

  METRICS_EXPORTER_CONSOLE = 'console';
  METRICS_EXPORTER_OTLP = 'otlp';

  constructor() {
    this.traceEnabled = loadAsBool('APPIUM_OTEL_TRACE_ENABLED', true);
    this.metricsEnabled = loadAsBool('APPIUM_OTEL_METRICS_ENABLED', true);

    this.semantic = load('APPIUM_OTEL_TRACE_SEMANTIC', this.TRACE_SEMANTIC_HTTP);
    this.exporter = load('APPIUM_OTEL_TRACE_EXPORTER', this.TRACE_EXPORTER_OTLP);

    this.autoDetectResources = loadAsBool('APPIUM_OTEL_AUTO_DETECT_RESOURCES', true);
    this.serviceName = load('APPIUM_OTEL_SERVICE_NAME', 'appium');
    this.attributes = strToAttributes(load('APPIUM_OTEL_ATTRIBUTES', ''));

    const defaultAttributesInCaps = 'platformName';
    this.attributesInCaps = load('APPIUM_OTEL_ATTRIBUTES_IN_CAPS', defaultAttributesInCaps).split(',');
    log.info(`attributes in Capabilities = ${JSON.stringify(this.attributesInCaps)}`);

    this.metricsExporter = load('APPIUM_OTEL_METRICS_EXPORTER', this.METRICS_EXPORTER_OTLP);
    this.metricsExportIntervalMillis = load('APPIUM_OTEL_METRICS_EXPORT_INTERVAL_MILLIS', 10000);
    log.info(`metrics export interval = ${this.metricsExportIntervalMillis} ms`);
    this.meterName = load('METER_NAME', 'appium-otel-plugin');

    this.debug = loadAsBool('DEBUG', false);
  }
}

export const config = new Config();
