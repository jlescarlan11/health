import { Router } from 'express';
import { validateSchema } from '../middleware/validation';
import * as authController from '../controllers/authController';
import { LoginSchema, SignupSchema } from '../schemas/authSchema';

const router = Router();

router.post('/signup', validateSchema(SignupSchema), authController.signup);
router.post('/login', validateSchema(LoginSchema), authController.login);

export default router;
