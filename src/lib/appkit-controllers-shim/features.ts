/**
 * AppKit Controllers Features Shim
 * 
 * Provides feature-related exports for @reown/appkit-controllers/features
 */

import { ReownAuthentication } from './index';

export const FeaturesController = {
  state: { features: {} },
} as any;

export { ReownAuthentication };

export default {
  FeaturesController,
  ReownAuthentication,
};
