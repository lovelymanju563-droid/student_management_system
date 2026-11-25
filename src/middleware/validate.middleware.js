import AppError from '../utils/appError.js';

/**
 * Validates `req.body`, `req.query`, or `req.params` using a Zod schema.
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(new AppError('Validation failed', 400, details));
    }
    req[source] = result.data;
    return next();
  };
}
