const { AUTHORIZATION_ERROR_CODE } = require('../constants');

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = AUTHORIZATION_ERROR_CODE;
  }
}

module.exports = AuthorizationError;
