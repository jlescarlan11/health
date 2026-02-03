"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSession = exports.createSessionForUser = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userMappers_1 = require("../utils/userMappers");
const prisma_1 = __importDefault(require("../lib/prisma"));
const jwtAccessSecret = process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
const jwtAccessExpiresIn = (process.env.JWT_EXPIRES_IN || '1h');
const jwtRefreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d');
if (!jwtAccessSecret) {
    throw new Error('JWT_SECRET environment variable is required for token management');
}
if (!jwtRefreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required for token refresh');
}
const accessTokenOptions = { expiresIn: jwtAccessExpiresIn };
const refreshTokenOptions = { expiresIn: jwtRefreshExpiresIn };
const buildAppError = (message, statusCode = 401) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
const hashToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
const getExpirationDateFromToken = (token) => {
    const decoded = jsonwebtoken_1.default.decode(token);
    if (decoded?.exp && typeof decoded.exp === 'number') {
        return new Date(decoded.exp * 1000);
    }
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};
const persistRefreshToken = async (token, userId) => {
    const expiresAt = getExpirationDateFromToken(token);
    await prisma_1.default.refreshToken.create({
        data: {
            tokenHash: hashToken(token),
            userId,
            expiresAt,
        },
    });
};
const createAccessToken = (user) => jsonwebtoken_1.default.sign({
    sub: user.id,
    phoneNumber: user.phoneNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: user.dateOfBirth,
    sexAtBirth: user.sexAtBirth,
}, jwtAccessSecret, accessTokenOptions);
const createRefreshToken = (userId) => jsonwebtoken_1.default.sign({ sub: userId, type: 'refresh' }, jwtRefreshSecret, refreshTokenOptions);
const createSessionForUser = async (user) => {
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user.id);
    await persistRefreshToken(refreshToken, user.id);
    return { accessToken, refreshToken };
};
exports.createSessionForUser = createSessionForUser;
const refreshSession = async (refreshToken) => {
    if (!refreshToken) {
        throw buildAppError('Refresh token is required', 400);
    }
    let decodedToken;
    try {
        decodedToken = jsonwebtoken_1.default.verify(refreshToken, jwtRefreshSecret);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw buildAppError('Refresh token expired', 401);
        }
        throw buildAppError('Invalid refresh token', 401);
    }
    if (decodedToken.type !== 'refresh' || !decodedToken.sub) {
        throw buildAppError('Invalid refresh token', 401);
    }
    const storedToken = await prisma_1.default.refreshToken.findUnique({
        where: { tokenHash: hashToken(refreshToken) },
    });
    if (!storedToken || storedToken.revoked) {
        throw buildAppError('Invalid refresh token', 401);
    }
    if (storedToken.expiresAt && storedToken.expiresAt.getTime() < Date.now()) {
        await prisma_1.default.refreshToken.update({
            where: { tokenHash: storedToken.tokenHash },
            data: { revoked: true },
        });
        throw buildAppError('Refresh token expired', 401);
    }
    const user = await prisma_1.default.user.findUnique({ where: { id: storedToken.userId } });
    if (!user) {
        throw buildAppError('User not found', 401);
    }
    await prisma_1.default.refreshToken.update({
        where: { tokenHash: storedToken.tokenHash },
        data: { revoked: true },
    });
    const publicUser = (0, userMappers_1.toPublicUser)(user);
    const tokens = await (0, exports.createSessionForUser)(publicUser);
    return { user: publicUser, ...tokens };
};
exports.refreshSession = refreshSession;
//# sourceMappingURL=tokenService.js.map