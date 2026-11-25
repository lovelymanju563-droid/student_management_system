export default class AppError extends Error {
  /**
   * Operational application error with HTTP status code.
   * @param {string} message
   * @param {number} statusCode
   * @param {unknown} [details]
   */
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
