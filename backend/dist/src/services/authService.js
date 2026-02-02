"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.signup = void 0;
const prisma_1 = require("../../generated/prisma");
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_2 = __importDefault(require("../lib/prisma"));
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '1h');
const jwtSignOptions = {
    expiresIn: jwtExpiresIn,
};
if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required for authentication');
}
const createPublicUser = (user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth.toISOString(),
    sexAtBirth: user.sexAtBirth,
});
const createToken = (user) => jsonwebtoken_1.default.sign({
    sub: user.id,
    phoneNumber: user.phoneNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    dateOfBirth: user.dateOfBirth,
    sexAtBirth: user.sexAtBirth,
}, jwtSecret, jwtSignOptions);
const buildError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};
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
                sexAtBirth: payload.sexAtBirth,
                passwordHash: hashedPassword,
                healthProfile: {
                    create: {},
                },
            },
        });
        const publicUser = createPublicUser(user);
        return {
            user: publicUser,
            token: createToken(publicUser),
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
    const publicUser = createPublicUser(user);
    return {
        user: publicUser,
        token: createToken(publicUser),
    };
};
exports.login = login;
//# sourceMappingURL=authService.js.map