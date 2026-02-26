'use strict';

class BaseProvider {
  constructor(config = {}) {
    this.config = config;
  }

  async chatCompletion(messages, options = {}) {
    throw new Error('Subclass must implement chatCompletion');
  }
}

module.exports = BaseProvider;
