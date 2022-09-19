const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { Resource } = require('@opentelemetry/resources');
const { ConsoleSpanExporter, BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { CommandSemantic, HTTPSemantic, Semantic } = require('./trace');
const { config } = require('./config');
const { log } = require('./logger');

class TracerDelegatorFactory {
  constructor(conf) {
    if (!conf.traceEnabled) {
      return;
    }
    this.semantic = this.newSemantic(conf);
    this.tracer = this.newTracer(conf, this.semantic);
  }

  newSemantic(conf) {
    switch (conf.semantic) {
      case conf.TRACE_SEMANTIC_COMMAND:
        log.info('Use command trace semantic.');
        return new CommandSemantic(conf.attributesInCaps, conf.attributes);
      case conf.TRACE_SEMANTIC_HTTP:
        log.info('Use HTTP trace semantic.');
        return new HTTPSemantic(conf.attributesInCaps, conf.attributes);
      default:
        log.warn(`unknown semantic: ${conf.semantic}`);
        return new Semantic();
    };
  }

  newTracer(conf, semantic) {
    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: conf.serviceName,
      }),
    });

    if (conf.isExporterEnabled(conf.TRACE_EXPORTER_CONSOLE)) {
      provider.addSpanProcessor(new BatchSpanProcessor(
        new ConsoleSpanExporter()
      ));
      log.info('Console trace exporter is enabled.');
    }

    if (conf.isExporterEnabled(conf.TRACE_EXPORTER_ZIPKIN)) {
      provider.addSpanProcessor(new BatchSpanProcessor(
        new ZipkinExporter({
          serviceName: conf.serviceName,
        })
      ));
      log.info('zipkin trace exporter is enabled.');
    }

    if (conf.isExporterEnabled(conf.TRACE_EXPORTER_OTLP)) {
      provider.addSpanProcessor(new BatchSpanProcessor(
        new OTLPTraceExporter()
      ));
      log.info('OTLP trace exporter is enabled.');
    }

    provider.register();

    const opts = semantic.registerOption(provider);
    registerInstrumentations(opts);

    return provider.getTracer(conf.serviceName);
  };

  newDelegators() {
    if (this.semantic && this.tracer) {
      return [this.semantic.newDelegater(this.tracer)];
    }
    return [];
  }
}

export const tracerDelegatorFactory = new TracerDelegatorFactory(config);
