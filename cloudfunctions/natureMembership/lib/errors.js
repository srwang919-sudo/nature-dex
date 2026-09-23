'use strict';

class DomainError extends Error {
  constructor(code, message = code, httpStatus = 400, retryable = false) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable;
  }
}

function fail(code, message, httpStatus, retryable) {
  throw new DomainError(code, message, httpStatus, retryable);
}

module.exports = { DomainError, fail };
