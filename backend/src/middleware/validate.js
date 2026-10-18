import { z } from 'zod';

/**
 * Create an Express middleware that validates req.body against a Zod schema.
 * On failure, sends 422 with field-level details.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(422).json({
        success: false,
        error: { message: 'Validation failed', details },
      });
    }
    req.validated = result.data;
    next();
  };
}
