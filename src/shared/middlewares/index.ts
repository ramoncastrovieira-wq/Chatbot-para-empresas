// Shared middlewares placeholder
import { Request, Response, NextFunction } from 'express';

export const dummyMiddleware = (req: Request, res: Response, next: NextFunction) => next();
