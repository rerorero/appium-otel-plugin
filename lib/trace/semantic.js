const { Delegator } = require('../appium');

class Semantic {
  newDelegater(tracer) {
    return new Delegator();
  };

  instrumentations() {
    return [];
  }
}

export { Semantic };
