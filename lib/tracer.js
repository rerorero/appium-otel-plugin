const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { Resource } = require('@opentelemetry/resources');
const { ConsoleSpanExporter, BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { config, semantic } = require('./config.js');
const { log } = require('./logger.js');

function newProvider(conf, semantic) {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: conf.serviceName,
    }),
  });

  if (conf.consoleExporterEnabled) {
    provider.addSpanProcessor(new BatchSpanProcessor(
      new ConsoleSpanExporter()
    ));
    log.info('console exporter is enabled.');
  }

  if (conf.zipkinExporterEnabled) {
    provider.addSpanProcessor(new BatchSpanProcessor(
      new ZipkinExporter({
        serviceName: conf.serviceName,
      })
    ));
    log.info('zipkin exporter is enabled.');
  }

  provider.register();

  const opts = semantic.registerOption(provider);
  registerInstrumentations(opts);

  return provider;
};

const provider = newProvider(config, semantic);
export { provider };

