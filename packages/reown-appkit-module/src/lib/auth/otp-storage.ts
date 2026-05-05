/**
 * OTP Storage Utility
 * 
 * Simple in-memory OTP storage for development.
 * In production, replace with Redis or a dedicated OTP table.
 */

interface OTPData {
  otp: string;
  expiresAt: Date;
}

// Simple in-memory OTP storage (use Redis in production)
const otpStore = new Map<string, OTPData>();

/**
 * Store OTP for an email address
 */
export async function storeOTP(email: string, otp: string, expiresAt: Date): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // TODO: Replace with Redis in production
  // await redis.setex(`otp:${normalizedEmail}`, 600, JSON.stringify({ otp, expiresAt }));
  
  otpStore.set(normalizedEmail, { otp, expiresAt });
}

/**
 * Get stored OTP for an email address
 */
export async function getStoredOTP(email: string): Promise<OTPData | null> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // TODO: Replace with Redis lookup in production
  // const stored = await redis.get(`otp:${normalizedEmail}`);
  // return stored ? JSON.parse(stored) : null;
  
  return otpStore.get(normalizedEmail) || null;
}

/**
 * Delete stored OTP for an email address
 */
export async function deleteStoredOTP(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  
  // TODO: Replace with Redis deletion in production
  // await redis.del(`otp:${normalizedEmail}`);
  
  otpStore.delete(normalizedEmail);
}

/**
 * Clean up expired OTPs (call periodically)
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  const now = new Date();
  
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}

