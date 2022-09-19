const { Delegator } = require('../appium');

class Semantic {
  newDelegater(tracer) {
    return new Delegator();
  };

  registerOption(provider) {
    return {};
  };
}

export { Semantic };
