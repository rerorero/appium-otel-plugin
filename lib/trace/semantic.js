const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { Delegator } = require('../appium');

class Semantic {
  newDelegater(conf, tracer) {
    return new Delegator();
  };

  registerOption(provider) {
    return {
      instrumentations: [
        new ExpressInstrumentation(),
        new HttpInstrumentation(),
      ],
    };
  };
}

export { Semantic };
