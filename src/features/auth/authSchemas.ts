import { z } from 'zod';

export const emailSchema = z.string().trim().email('Enter a valid email address.');
export const passwordSchema = z.string().min(8, 'Use at least 8 characters.').max(72, 'Use no more than 72 characters.');

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.') });
export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter your name.').max(100),
  email: emailSchema,
  password: passwordSchema,
});
export const forgotPasswordSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ password: passwordSchema, confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
