"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.refresh = exports.login = exports.signup = void 0;
const authService = __importStar(require("../services/authService"));
const formatError = (error) => {
    if (error instanceof Error && error.statusCode) {
        return {
            status: error.statusCode,
            message: error.message,
        };
    }
    return {
        status: 500,
        message: 'Authentication failed',
    };
};
const signup = async (req, res) => {
    try {
        const { confirmPassword, ...payload } = req.body;
        const result = await authService.signup(payload);
        return res.status(201).json({
            success: true,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            token: result.accessToken,
            user: result.user,
        });
    }
    catch (error) {
        const formatted = formatError(error);
        console.error('Signup error:', error);
        return res.status(formatted.status).json({
            success: false,
            error: formatted.message,
        });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    try {
        const payload = req.body;
        const result = await authService.login(payload);
        return res.status(200).json({
            success: true,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            token: result.accessToken,
            user: result.user,
        });
    }
    catch (error) {
        const formatted = formatError(error);
        console.error('Login error:', error);
        return res.status(formatted.status).json({
            success: false,
            error: formatted.message,
        });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        const payload = req.body;
        const result = await authService.refreshSession(payload.refreshToken);
        return res.status(200).json({
            success: true,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            token: result.accessToken,
            user: result.user,
        });
    }
    catch (error) {
        const formatted = formatError(error);
        console.error('Refresh error:', error);
        return res.status(formatted.status).json({
            success: false,
            error: formatted.message,
        });
    }
};
exports.refresh = refresh;
//# sourceMappingURL=authController.js.map