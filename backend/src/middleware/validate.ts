import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const zodValidator = (schema: ZodSchema, source: 'body' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = source === 'query' ? req.query : req.body;
      const parsed = schema.parse(data);
      (req as any).validatedData = parsed;
      next();
    } catch (error) {
      next(error);
    }
  };
};

