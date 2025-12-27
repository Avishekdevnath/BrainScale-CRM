import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const zodValidator = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      let data;
      if (source === 'query') {
        data = req.query;
      } else if (source === 'params') {
        data = req.params;
      } else {
        data = req.body;
      }
      const parsed = schema.parse(data);
      (req as any).validatedData = parsed;
      next();
    } catch (error) {
      next(error);
    }
  };
};

