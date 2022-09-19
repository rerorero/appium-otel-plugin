const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { Collector, MetricsDelegator } = require('./metrics');
const { config } = require('./config');
const { log } = require('./logger');

class MeterDelegatorFactory {
  constructor(conf) {
    if (!conf.metricsEnabled) {
      return;
    }
    const meter = this.newMeter(conf);
    this.collector = new Collector(meter, conf.attributesInCaps, conf.metricsExportIntervalMillis);
  }

  newMeter(conf) {
    const metricExporter = new OTLPMetricExporter({});

    const meterProvider = new MeterProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: conf.serviceName,
      }),
    });

    meterProvider.addMetricReader(new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: conf.metricsExportIntervalMillis,
    }));
    log.info('OTLP metrics exporter is enabled.');

    return meterProvider.getMeter(conf.meterName);
  }

  newDelegators() {
    if (this.collector) {
      return [new MetricsDelegator(this.collector)];
    }
    return [];
  }
}

export const meterDelegatorFactory = new MeterDelegatorFactory(config);
