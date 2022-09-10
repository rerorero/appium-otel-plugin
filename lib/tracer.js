const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { Resource } = require('@opentelemetry/resources');
const { ConsoleSpanExporter, BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { config } = require('./config');
const { CommandSemantic, HTTPSemantic, Semantic } = require('./trace');
const { log } = require('./logger');


function newProvider(conf, semantic) {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: conf.serviceName,
    }),
  });

  if (conf.isExporterEnabled(conf.EXPORTER_CONSOLE)) {
    provider.addSpanProcessor(new BatchSpanProcessor(
      new ConsoleSpanExporter()
    ));
    log.info('console exporter is enabled.');
  }

  if (conf.isExporterEnabled(conf.EXPORTER_ZIPKIN)) {
    provider.addSpanProcessor(new BatchSpanProcessor(
      new ZipkinExporter({
        serviceName: conf.serviceName,
      })
    ));
    log.info('zipkin exporter is enabled.');
  }

  if (conf.isExporterEnabled(conf.EXPORTER_OTLP)) {
    provider.addSpanProcessor(new BatchSpanProcessor(
      new OTLPTraceExporter()
    ));
    log.info('OTLP exporter is enabled.');
  }

  provider.register();

  const opts = semantic.registerOption(provider);
  registerInstrumentations(opts);

  return provider;
};

export const semantic = function() {
  switch (config.semantic) {
    case config.SEMANTIC_COMMAND:
      log.info('use command semantic.');
      return new CommandSemantic();
    case config.SEMANTIC_HTTP:
      log.info('use HTTP semantic.');
      return new HTTPSemantic();
    default:
      log.warn(`unknown semantic: ${config.semantic}`);
      return new Semantic();
  };
}();

export const provider = newProvider(config, semantic);
