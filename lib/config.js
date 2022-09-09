const { CommandSemantic } = require('./command-semantic.js');
const { HTTPSemantic } = require('./http-semantic.js');
const { Semantic } = require('./semantic.js');
const { log } = require('./logger');

function load(name, defaults) {
  return process.env[name] ?? defaults;
};

class Config {
  SEMANTIC_COMMAND = 'command';
  SEMANTIC_HTTP = 'http';

  EXPORTER_CONSOLE = 'console';
  EXPORTER_ZIPKIN = 'zipkin';
  EXPORTER_OTLP = 'otlp';

  constructor() {
    this.semantic = load('APPIUM_OTEL_SEMANTIC', this.SEMANTIC_COMMAND);
    this.exporter = load('APPIUM_OTEL_EXPORTER', this.EXPORTER_CONSOLE).split(',');

    this.zipkinExporterEnabled = this.exporter.includes(this.EXPORTER_ZIPKIN);
    this.consoleExporterEnabled = this.exporter.includes(this.EXPORTER_CONSOLE);
    this.otlpExporterEnabled = this.exporter.includes(this.EXPORTER_OTLP);

    this.serviceName = load('APPIUM_OTEL_SERVICE_NAME', 'appium');

    const defaultAttributesInCaps = 'platformName';
    this.attributesInCaps = load('APPIUM_OTEL_ATTRIBUTES_IN_CAPS', defaultAttributesInCaps).split(',');
  }

  isExporterEnabled(exporter) {
    return this.exporter.includes(exporter);
  }
}

const config = new Config();

const semantic = function() {
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

export { config, semantic };
