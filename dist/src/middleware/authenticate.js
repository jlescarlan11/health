"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required for authentication middleware');
}
const extractToken = (header) => {
    if (!header) {
        return null;
    }
    const [scheme, value] = header.split(' ');
    if (scheme.toLowerCase() !== 'bearer' || !value) {
        return null;
    }
    return value.trim();
};
const isAuthPayload = (value) => typeof value === 'object' &&
    value !== null &&
    typeof value.sub === 'string';
const requireAuth = (req, res, next) => {
    const token = extractToken(req.headers.authorization);
    if (!token) {
        return res.status(401).json({ error: 'Authentication token is required' });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
        if (!isAuthPayload(payload)) {
            throw new Error('Invalid token payload');
        }
        req.user = payload;
        return next();
    }
    catch (error) {
        console.error('JWT verification failed:', error);
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=authenticate.js.map