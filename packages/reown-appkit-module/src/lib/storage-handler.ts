/**
 * Storage Handler
 *
 * Handles browser storage errors, particularly IndexedDB issues
 * that can occur with wallet integrations (Reown AppKit)
 */

export class StorageHandler {
    private static hasLoggedError = false;

    /**
     * Check if browser storage is available and working
     */
    static async checkStorageAvailability(): Promise<{
        available: boolean;
        error?: string;
    }> {
        // Only run on client side
        if (typeof window === 'undefined') {
            return { available: false, error: 'Server side' };
        }

        try {
            // Check localStorage
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);

            // Check sessionStorage
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);

            // Check IndexedDB availability
            if (!window.indexedDB) {
                return { available: false, error: 'IndexedDB not supported' };
            }

            // Test IndexedDB access
            await this.testIndexedDB();

            return { available: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
            return { available: false, error: errorMessage };
        }
    }

    /**
     * Test IndexedDB access
     */
    private static async testIndexedDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const request = window.indexedDB.open('__test_db__', 1);

                request.onerror = () => {
                    reject(new Error('IndexedDB access denied'));
                };

                request.onsuccess = () => {
                    const db = request.result;
                    db.close();
                    // Clean up test database
                    window.indexedDB.deleteDatabase('__test_db__');
                    resolve();
                };

                request.onupgradeneeded = () => {
                    // Database creation successful
                    resolve();
                };

                // Timeout after 2 seconds
                setTimeout(() => {
                    reject(new Error('IndexedDB test timeout'));
                }, 2000);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Clear corrupted IndexedDB databases
     */
    static async clearCorruptedDatabases(): Promise<void> {
        if (typeof window === 'undefined') return;

        try {
            // Clear wallet-related IndexedDB databases
            const dbNames = ['wagmi.store', 'wagmi.wallet', '@reown/appkit-store', 'walletconnect'];

            for (const dbName of dbNames) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        const request = window.indexedDB.deleteDatabase(dbName);
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                        request.onblocked = () => {
                            console.warn(`Database ${dbName} is blocked. Close other tabs and try again.`);
                            resolve();
                        };
                        setTimeout(() => resolve(), 1000); // Timeout after 1 second
                    });
                    console.log(`Cleared database: ${dbName}`);
                } catch (err) {
                    console.warn(`Could not clear database ${dbName}:`, err);
                }
            }
        } catch (error) {
            console.error('Error clearing databases:', error);
        }
    }

    /**
     * Handle storage errors with user-friendly messages
     */
    static handleStorageError(error: Error): void {
        // Prevent duplicate error logs
        if (this.hasLoggedError) return;
        this.hasLoggedError = true;

        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('indexeddb') || errorMessage.includes('internalerror')) {
            console.warn(
                '⚠️ Browser Storage Issue Detected\n\n' +
                    'This usually happens when:\n' +
                    '1. Using Private/Incognito browsing mode\n' +
                    '2. Browser storage is full\n' +
                    '3. Browser extensions are blocking storage\n' +
                    '4. Multiple tabs are accessing storage simultaneously\n\n' +
                    'Solutions:\n' +
                    '- Try regular browsing mode\n' +
                    '- Clear browser cache and storage\n' +
                    '- Close other tabs\n' +
                    '- Disable conflicting browser extensions\n\n' +
                    'The application will continue to work with limited wallet functionality.',
            );

            // Try to clear corrupted databases
            this.clearCorruptedDatabases();
        } else {
            console.error('Storage error:', error);
        }
    }

    /**
     * Initialize storage error handling
     */
    static initialize(): void {
        if (typeof window === 'undefined') return;

        // Override console.error to catch IndexedDB errors
        const originalError = console.error;
        console.error = (...args: any[]) => {
            const errorString = args.join(' ');

            if (errorString.includes('IndexedDB') || errorString.includes('InternalError')) {
                const error = new Error(errorString);
                this.handleStorageError(error);
            } else if (!args[0]?.includes?.('remote configuration') && 
                       !errorString.includes('Blob may be expired or deleted') &&
                       !errorString.includes('Image Cache Error') &&
                       !errorString.includes('Lobby session expired') &&
                       !errorString.includes('gaming session has expired') &&
                       !errorString.includes('Authentication required for real money gaming') &&
                       !errorString.includes('Authentication required') &&
                       !errorString.includes('Orphaned session detected') &&
                       !errorString.includes('CoreLocationProvider') &&
                       !errorString.includes('kCLErrorLocationUnknown') &&
                       !errorString.includes('GeolocationPositionError') &&
                       !errorString.includes('Error getting location') &&
                       !errorString.includes('cca-lite.coinbase.com') &&
                       !errorString.includes('ERR_CONNECTION_REFUSED') &&
                       !(errorString.includes('POST') && errorString.includes('coinbase.com'))) {
                // Suppress Reown remote config notices, handled image cache errors, expected session expiration,
                // authentication errors (expected when user tries real mode without auth),
                // orphaned session errors (handled by sign-out flow),
                // geolocation errors (handled with user-friendly messages),
                // and Coinbase AMP analytics connection errors (non-critical)
                originalError.apply(console, args);
            }
        };

        // Check storage availability on initialization
        this.checkStorageAvailability().then(({ available, error }) => {
            if (!available) {
                console.warn('Storage Check:', error || 'Storage not available');

                if (error?.includes('IndexedDB')) {
                    console.info(
                        '💡 Tip: Wallet features may be limited. ' +
                            'Try using regular browsing mode for full functionality.',
                    );
                }
            }
        });
    }

    /**
     * Safe wrapper for localStorage operations
     */
    static safeLocalStorage = {
        getItem: (key: string): string | null => {
            try {
                return localStorage.getItem(key);
            } catch (error) {
                console.warn(`localStorage.getItem failed for key: ${key}`);
                return null;
            }
        },

        setItem: (key: string, value: string): boolean => {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (error) {
                console.warn(`localStorage.setItem failed for key: ${key}`);
                return false;
            }
        },

        removeItem: (key: string): boolean => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn(`localStorage.removeItem failed for key: ${key}`);
                return false;
            }
        },
    };

    /**
     * Safe wrapper for sessionStorage operations
     */
    static safeSessionStorage = {
        getItem: (key: string): string | null => {
            try {
                return sessionStorage.getItem(key);
            } catch (error) {
                console.warn(`sessionStorage.getItem failed for key: ${key}`);
                return null;
            }
        },

        setItem: (key: string, value: string): boolean => {
            try {
                sessionStorage.setItem(key, value);
                return true;
            } catch (error) {
                console.warn(`sessionStorage.setItem failed for key: ${key}`);
                return false;
            }
        },

        removeItem: (key: string): boolean => {
            try {
                sessionStorage.removeItem(key);
                return true;
            } catch (error) {
                console.warn(`sessionStorage.removeItem failed for key: ${key}`);
                return false;
            }
        },
    };
}

