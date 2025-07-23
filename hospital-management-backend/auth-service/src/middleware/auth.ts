// JWT Authentication Middleware - Updated for security
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Updated: Mon, Sep  8, 2025 12:58:39 AM
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};
