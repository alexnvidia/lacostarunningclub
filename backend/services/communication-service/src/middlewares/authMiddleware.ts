import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

/**
 * Verifica el JWT y adjunta los datos del usuario a req.user.
 */
export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`Unauthorized access attempt to ${req.path} from ${req.ip}`);
        res.status(401).json({
            error: 'No token provided',
            code: 'UNAUTHORIZED',
        });
        return;
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-please-12345'
        ) as {
            id: string;
            email: string;
            role: string;
        };

        req.user = decoded;
        console.debug(`User authenticated: ${decoded.email} (${decoded.role}) - Path: ${req.path}`);
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            console.warn(`Token expired for ${req.path} from ${req.ip}`);
            res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            console.warn(`Invalid token for ${req.path} from ${req.ip}`);
            res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
            return;
        }
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
};

/**
 * Verifica que el usuario autenticado tenga rol ADMIN.
 * Debe aplicarse después de authMiddleware.
 */
export const isAdmin = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
        return;
    }

    if (req.user.role !== 'ADMIN') {
        console.warn(`Forbidden access attempt by ${req.user.email} (${req.user.role}) to ${req.path}`);
        res.status(403).json({ error: 'Forbidden - Admin access required', code: 'FORBIDDEN' });
        return;
    }

    next();
};
