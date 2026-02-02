import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to ensure errors are properly caught and passed to Express error handler
 * This is especially important in Express 5
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
