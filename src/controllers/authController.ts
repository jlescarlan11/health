import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { LoginForm, SignupForm } from '../schemas/authSchema';

const formatError = (error: unknown) => {
  if (error instanceof Error && (error as any).statusCode) {
    return {
      status: (error as any).statusCode,
      message: error.message,
    };
  }
  return {
    status: 500,
    message: 'Authentication failed',
  };
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { confirmPassword, ...payload } = req.body as SignupForm;
    const result = await authService.signup(payload);
    return res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    const formatted = formatError(error);
    console.error('Signup error:', error);
    return res.status(formatted.status).json({
      success: false,
      error: formatted.message,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const payload = req.body as LoginForm;
    const result = await authService.login(payload);
    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    const formatted = formatError(error);
    console.error('Login error:', error);
    return res.status(formatted.status).json({
      success: false,
      error: formatted.message,
    });
  }
};
