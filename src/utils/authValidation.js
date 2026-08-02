import { z } from 'zod';

/**
 * Helper: Sanitize string to strip HTML tags, script tags, and malicious special characters
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // strip script tags
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/javascript:/gi, '') // strip javascript: links
    .replace(/on\w+\s*=/gi, '') // strip event attributes (onload, onerror, etc.)
    .trim();
}

/**
 * 1. Zod Schema for Login Route
 */
export const loginSchema = z.object({
  email: z
    .string()
    .transform(val => sanitizeInput(val))
    .pipe(z.string().email().min(5).max(120)),
  password: z
    .string()
    .min(6)
    .max(128)
});

/**
 * 2. Zod Schema for Signup Route
 */
export const signupSchema = z.object({
  email: z
    .string()
    .transform(val => sanitizeInput(val))
    .pipe(z.string().email().min(5).max(120)),
  password: z
    .string()
    .min(6)
    .max(128),
  displayName: z
    .string()
    .optional()
    .transform(val => (val ? sanitizeInput(val) : undefined))
    .pipe(z.string().min(2).max(50).optional()),
  username: z
    .string()
    .optional()
    .transform(val => (val ? sanitizeInput(val) : undefined))
    .pipe(z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional())
});

/**
 * 3. Zod Schema for Reset Password Route
 */
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .transform(val => sanitizeInput(val))
    .pipe(z.string().email().min(5).max(120))
});

/**
 * Server-side / Handler Auth Validation Wrapper
 * Validates and sanitizes auth inputs regardless of client-side checks.
 * Logs failures for security monitoring.
 * Returns a generic error message for security.
 */
export function validateAuthInput(data, schemaType = 'login') {
  let schema = loginSchema;
  if (schemaType === 'signup') schema = signupSchema;
  if (schemaType === 'reset') schema = resetPasswordSchema;

  const result = schema.safeParse(data);

  if (!result.success) {
    // Log detailed failure for security monitoring
    console.warn(`[SECURITY MONITOR] Auth Validation Failure (${schemaType}):`, {
      timestamp: new Date().toISOString(),
      issues: result.error.issues.map(i => ({ path: i.path.join('.'), code: i.code }))
    });

    // Return a generic error message (do not expose which specific field failed)
    return {
      isValid: false,
      error: "Invalid email or password format. Please verify your details and try again.",
      data: null
    };
  }

  return {
    isValid: true,
    error: null,
    data: result.data
  };
}
