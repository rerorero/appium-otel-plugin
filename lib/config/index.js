function load(name, defaults) {
  return process.env[name] ?? defaults;
};

class Config {
  TRACE_SEMANTIC_COMMAND = 'command';
  TRACE_SEMANTIC_HTTP = 'http';

  TRACE_EXPORTER_CONSOLE = 'console';
  TRACE_EXPORTER_ZIPKIN = 'zipkin';
  TRACE_EXPORTER_OTLP = 'otlp';

  constructor() {
    this.traceEnabled = load('APPIUM_OTEL_TRACE_ENABLED', 'true').toLowerCase() === 'true';
    this.metricsEnabled = load('APPIUM_OTEL_METRICS_ENABLED', 'true').toLowerCase() === 'true';

    this.semantic = load('APPIUM_OTEL_TRACE_SEMANTIC', this.TRACE_SEMANTIC_COMMAND);
    this.exporter = load('APPIUM_OTEL_TRACE_EXPORTER', this.TRACE_EXPORTER_CONSOLE).split(',');

    this.serviceName = load('APPIUM_OTEL_SERVICE_NAME', 'appium');

    const defaultAttributesInCaps = 'platformName';
    this.attributesInCaps = load('APPIUM_OTEL_ATTRIBUTES_IN_CAPS', defaultAttributesInCaps).split(',');

    this.metricsExportIntervalMillis = load('METRICS_EXPORT_INTERVAL_MILLIS', 10000);
    this.meterName = load('METER_NAME', 'appium-otlp-plugin');
  }

  isExporterEnabled(exporter) {
    return this.exporter.includes(exporter);
  }
}

export const config = new Config();
