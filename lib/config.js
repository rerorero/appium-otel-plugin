const { SessionSemantic } = require('./session-semantic.js');
const { HTTPSemantic } = require('./http-semantic.js');
const { Semantic } = require('./semantic.js');
const { log } = require('./logger');

const envPrefix = 'APPIUM_OTEL_';

function load(name, defaults) {
  return process.env[`${envPrefix}${name}`] ?? defaults;
};

const config = new function() {
  this.SEMANTIC_SESSION = 'session';
  this.SEMANTIC_HTTP = 'http';
  this.semantic = load('SEMANTIC', this.SEMANTIC_SESSION);

  this.EXPORTER_CONSOLE = 'console';
  this.EXPORTER_ZIPKIN = 'zipkin';
  this.exporter = load('EXPORTER', this.EXPORTER_CONSOLE).split(',');
  this.zipkinExporterEnabled = this.exporter.includes(this.EXPORTER_ZIPKIN);
  this.consoleExporterEnabled = this.exporter.includes(this.EXPORTER_CONSOLE);

  this.serviceName = load('SERVICE_NAME', 'appium');

  const defaultAttributesInCaps = 'deviceName';
  this.attributesInCaps = load('ATTRIBUTES_IN_CAPS', defaultAttributesInCaps).split(',');
};

const semantic = function() {
  switch (config.semantic) {
    case config.SEMANTIC_SESSION:
      log.info('use session semantic.');
      return new SessionSemantic();
    case config.SEMANTIC_HTTP:
      log.info('use HTTP semantic.');
      return new HTTPSemantic();
    default:
      log.warn(`unknown semantic: ${config.semantic}`);
      return new Semantic();
  };
}();

export { config, semantic };
