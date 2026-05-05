/**
 * Example usage of AppKitSignButton component
 * 
 * This component automatically handles:
 * - EOA accounts: Requests signature
 * - Social accounts: Skips signature (calls onSuccess with 'social-account-no-signature')
 */

import { AppKitSignButton } from './AppKitSignButton';

export function ExampleUsage() {
  return (
    <div className="space-y-4">
      <h2>AppKit Sign Button Examples</h2>
      
      {/* Basic usage */}
      <AppKitSignButton
        onSuccess={(signature) => {
          console.log('Signature received:', signature);
          if (signature === 'social-account-no-signature') {
            console.log('Social account - no signature needed');
            // Handle social account login
          } else {
            console.log('EOA signature:', signature);
            // Handle EOA signature verification
          }
        }}
        onError={(error) => {
          console.error('Signature error:', error);
        }}
      />

      {/* Custom message */}
      <AppKitSignButton
        message="Sign in to access premium features"
        onSuccess={(signature) => {
          console.log('Signed:', signature);
        }}
      />

      {/* Custom styling */}
      <AppKitSignButton
        className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
        onSuccess={(signature) => {
          console.log('Signed:', signature);
        }}
      />

      {/* Custom children */}
      <AppKitSignButton
        onSuccess={(signature) => {
          console.log('Signed:', signature);
        }}
      >
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Sign & Continue
        </span>
      </AppKitSignButton>
    </div>
  );
}

