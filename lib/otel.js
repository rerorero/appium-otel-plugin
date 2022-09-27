const opentelemetry = require('@opentelemetry/sdk-node');
const { metrics } = require('@opentelemetry/api-metrics');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { CommandSemantic, HTTPSemantic, Semantic } = require('./trace');
const { PeriodicExportingMetricReader, ConsoleMetricExporter } = require('@opentelemetry/sdk-metrics');
const { Collector, MetricsDelegator } = require('./metrics');
const { log } = require('./logger');
const process = require('process');
const { DiagConsoleLogger, DiagLogLevel, diag, trace } = require('@opentelemetry/api');

export class OpenTelemetry {
  constructor(conf) {
    this.semantic = null;
    this.collector = null;
    this.conf = conf;
    this.setupSDK(conf);
  }

  configureTracer(conf, sdkConfig) {
    if (!conf.traceEnabled) {
      log.info('tracer is disabled.');
      return;
    }

    let exporter;
    switch (conf.exporter) {
      case conf.TRACE_EXPORTER_CONSOLE:
        log.info('Console trace exporter is enabled.');
        exporter = new ConsoleSpanExporter();
        break;
      case conf.TRACE_EXPORTER_ZIPKIN:
        log.info('zipkin trace exporter is enabled.');
        exporter = new ZipkinExporter({});
        break;
      case conf.TRACE_EXPORTER_OTLP:
        log.info('OTLP trace exporter is enabled.');
        exporter = new OTLPTraceExporter();
        break;
      default:
        log.error(`unknown exporter name: ${conf.export}`);
        return;
    }

    let semantic;
    switch (conf.semantic) {
      case conf.TRACE_SEMANTIC_COMMAND:
        log.info('Use command trace semantic.');
        semantic = new CommandSemantic(conf.attributesInCaps, conf.attributes);
        break;
      case conf.TRACE_SEMANTIC_HTTP:
        log.info('Use HTTP trace semantic.');
        semantic = new HTTPSemantic(conf.attributesInCaps, conf.attributes);
        break;
      default:
        log.warn(`unknown semantic: ${conf.semantic}`);
        semantic = new Semantic();
        break;
    };

    sdkConfig.traceExporter = exporter;
    sdkConfig.instrumentations = semantic.instrumentations();
    this.semantic = semantic;
  }

  configureMetrics(conf, sdkConfig) {
    if (!conf.metricsEnabled) {
      return null;
    }

    let exporter;
    switch (conf.metricsExporter) {
      case conf.METRICS_EXPORTER_CONSOLE:
        log.info('Console metrics exporter is enabled.');
        exporter = new ConsoleMetricExporter();
        break;
      case conf.METRICS_EXPORTER_OTLP:
        log.info('OTLP metrics exporter is enabled.');
        exporter = new OTLPMetricExporter();
        break;
      default:
        log.error(`unknown metrics exporter name: ${conf.export}`);
        return;
    }

    const metricReader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: conf.metricsExportIntervalMillis,
    });

    sdkConfig.metricReader = metricReader;
  }

  setupSDK(conf) {
    if (conf.debug) {
      log.info('enable debug log');
      diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
    }

    const sdkConfig = {
      autoDetectResources: conf.autoDetectResources,
    };
    this.configureTracer(conf, sdkConfig);
    this.configureMetrics(conf, sdkConfig);
    this.sdk = new opentelemetry.NodeSDK(sdkConfig);
  }

  async start() {
    await this.sdk.start().then(() => {
      if (this.conf.metricsEnabled) {
        const meter = metrics.getMeter(this.conf.meterName);
        this.collector = new Collector(meter, this.conf.attributesInCaps, this.conf.metricsExportIntervalMillis, this.conf.attributes);
      }
    });

    process.on('SIGTERM', async () => {
      await this.sdk
        .shutdown()
        .then(
          () => log.info('SDK shut down successfully'),
          (err) => log.error('Error shutting down SDK', err)
        )
        .finally(() => process.exit(0));
    });
  }

  newDelegators() {
    const delegators = [];

    if (this.collector) {
      delegators.push(new MetricsDelegator(this.collector));
    }

    if (this.semantic) {
      const tracer = trace.getTracerProvider().getTracer(this.conf.serviceName);
      delegators.push(this.semantic.newDelegater(tracer));
    }

    return delegators;
  }
}

