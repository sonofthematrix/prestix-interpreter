// System user utility for reown-appkit-module package
// This provides a minimal interface compatible with the main project

export interface SystemUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

export const getSystemUser = (): SystemUser => ({
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN',
  name: 'System Admin'
});