"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSession = exports.login = exports.signup = void 0;
const prisma_1 = require("../../generated/prisma");
const argon2_1 = __importDefault(require("argon2"));
const prisma_2 = __importDefault(require("../lib/prisma"));
const userMappers_1 = require("../utils/userMappers");
const tokenService_1 = require("./tokenService");
const buildError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
const DEFAULT_SEX_AT_BIRTH = 'not_specified';
const sanitizePhoneNumber = (value) => value.trim();
const isPhoneNumberUniqueError = (error) => error instanceof prisma_1.Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002';
const signup = async (payload) => {
    const hashedPassword = await argon2_1.default.hash(payload.password);
    try {
        const user = await prisma_2.default.user.create({
            data: {
                firstName: payload.firstName.trim(),
                lastName: payload.lastName.trim(),
                phoneNumber: sanitizePhoneNumber(payload.phoneNumber),
                dateOfBirth: payload.dateOfBirth,
                sexAtBirth: payload.sexAtBirth ?? DEFAULT_SEX_AT_BIRTH,
                passwordHash: hashedPassword,
                healthProfile: {
                    create: {},
                },
            },
        });
        const publicUser = (0, userMappers_1.toPublicUser)(user);
        const session = await (0, tokenService_1.createSessionForUser)(publicUser);
        return {
            user: publicUser,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        };
    }
    catch (error) {
        if (isPhoneNumberUniqueError(error) &&
            Array.isArray(error.meta?.target) &&
            error.meta.target.includes('phoneNumber')) {
            throw buildError('Phone number already in use', 409);
        }
        throw error;
    }
};
exports.signup = signup;
const login = async (payload) => {
    const phoneNumber = sanitizePhoneNumber(payload.phoneNumber);
    const user = await prisma_2.default.user.findUnique({
        where: { phoneNumber },
    });
    if (!user) {
        throw buildError('Invalid phone number or password', 401);
    }
    const matches = await argon2_1.default.verify(user.passwordHash, payload.password);
    if (!matches) {
        throw buildError('Invalid phone number or password', 401);
    }
    const publicUser = (0, userMappers_1.toPublicUser)(user);
    const session = await (0, tokenService_1.createSessionForUser)(publicUser);
    return {
        user: publicUser,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
    };
};
exports.login = login;
const refreshSession = (refreshToken) => (0, tokenService_1.refreshSession)(refreshToken);
exports.refreshSession = refreshSession;
//# sourceMappingURL=authService.js.map