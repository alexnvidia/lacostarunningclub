import { Request, Response, NextFunction } from 'express';

// Extend the Request interface to include user information
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
                email: string;
            }
        }
    }
}

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    // Get user role from header
    const userRole = req.headers['x-user-role'] as string;



    console.log('Checking Admin Access for Role:', userRole); // Debug

    if (userRole !== 'ADMIN') {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Access restricted to administrators only'
        });
        return;
    }

    next();
};
