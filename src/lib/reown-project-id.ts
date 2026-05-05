/** Reown/AppKit project ID - must match dashboard.reown.com. */
export const REOWN_PROJECT_ID_FALLBACK = '122878b95737e1300958ec73a8c0b61a';
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID?.trim() || REOWN_PROJECT_ID_FALLBACK;

/** App display name for AppKit metadata and UI. Reown Cloud project ID remains prestix-app. */
export const REOWN_APP_NAME = 'PRESTIX.VIP';
