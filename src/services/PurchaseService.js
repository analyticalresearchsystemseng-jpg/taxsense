import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

// ============================================================================
// SECURITY & CONFIGURATION NOTE:
// API keys below are public SDK keys used for client-side RevenueCat SDK initialization.
// In production builds, consider passing these via Vite environment variables
// (e.g. import.meta.env.VITE_REVENUECAT_IOS_KEY / VITE_REVENUECAT_ANDROID_KEY).
// Never commit secret / server API keys into client code.
// ============================================================================
const IOS_REVENUECAT_KEY = 'appl_QCUkEjYUzWxEVwEMWJyneKlJTfj';
export const ANDROID_REVENUECAT_KEY = 'goog_PLACEHOLDER_KEY_REPLACE_ME'; // Google Play RevenueCat key placeholder

const USE_REAL_PAYMENTS = true;

/**
 * Returns or generates a per-installation anonymous UUID persisted in localStorage (P1-5).
 */
export function getAnonymousUserId() {
    const STORAGE_KEY = 'taxsense_anonymous_user_id';
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            id = crypto.randomUUID();
        } else {
            id = 'anon-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
        }
        localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
}

class PurchaseService {
    constructor() {
        this.isInitialized = false;
        this.mockMode = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            const platform = window.Capacitor?.getPlatform ? window.Capacitor.getPlatform() : 'web';
            const apiKey = platform === 'ios' ? IOS_REVENUECAT_KEY : platform === 'android' ? ANDROID_REVENUECAT_KEY : null;

            // Check if running on real platform with valid non-placeholder key
            const isValidKey = apiKey && apiKey !== 'REPLACE_WITH_YOUR_KEY' && !apiKey.includes('PLACEHOLDER');

            if (USE_REAL_PAYMENTS && isValidKey && (platform === 'ios' || platform === 'android')) {
                await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
                await Purchases.configure({ apiKey });
                this.mockMode = false;
                console.log(`RevenueCat initialized successfully for ${platform} (REAL MODE)`);
            } else {
                console.log(`RevenueCat: Running in Mock Mode (platform: ${platform}, key: ${apiKey ? (isValidKey ? 'valid' : 'placeholder') : 'none'}, forced: ${!USE_REAL_PAYMENTS})`);
                this.mockMode = true;
            }
            this.isInitialized = true;
        } catch (e) {
            console.error('RevenueCat initialization failed:', e);
        }
    }

    async identifyUser(userId) {
        if (!this.isInitialized || this.mockMode) return;
        try {
            const effectiveId = userId || getAnonymousUserId();
            await Purchases.logIn({ appUserID: effectiveId });
            console.log('RevenueCat: Identified user:', effectiveId);
        } catch (e) {
            console.error('RevenueCat: Login failed:', e);
        }
    }

    async logOut() {
        if (!this.isInitialized || this.mockMode) return;
        try {
            await Purchases.logOut();
            console.log('RevenueCat: Logged out');
        } catch (e) {
            console.error('RevenueCat: Logout failed:', e);
        }
    }

    // Helper: determine tier from entitlement info
    detectTierFromEntitlement(entitlement) {
        if (!entitlement) return 'free';
        const pid = (entitlement.productIdentifier || '').toLowerCase();
        const planId = (entitlement.productPlanIdentifier || '').toLowerCase();
        if (pid.includes('annual') || pid.includes('yearly') || pid.includes('year') ||
            planId.includes('annual') || planId.includes('yearly')) {
            return 'annual';
        }
        const cached = localStorage.getItem('taxsense_cached_tier');
        if (cached === 'annual' || cached === 'monthly') return cached;
        return 'monthly';
    }

    async checkSubscriptionStatus() {
        if (this.mockMode) {
            // In mock mode, check local storage for the specific tier
            const mockTier = localStorage.getItem('taxsense_pro_mock_tier');
            return mockTier ? mockTier : 'free';
        }

        try {
            const customerInfo = await Purchases.getCustomerInfo();
            const entitlement = customerInfo.entitlements?.active?.['pro_access'];
            if (entitlement) {
                const tier = this.detectTierFromEntitlement(entitlement);
                localStorage.setItem('taxsense_cached_tier', tier);
                return tier;
            }
            return 'free';
        } catch (e) {
            console.error('Failed to fetch customer info:', e);
            const cachedTier = localStorage.getItem('taxsense_cached_tier');
            return cachedTier || 'free';
        }
    }

    async purchasePro(planIndex = 0) {
        if (this.mockMode) {
            // Simulate a successful purchase for testing
            return new Promise((resolve) => {
                setTimeout(() => {
                    const tier = planIndex === 0 ? 'monthly' : 'annual';
                    localStorage.setItem('taxsense_pro_mock_tier', tier);
                    resolve(tier);
                }, 1000);
            });
        }

        try {
            console.log('[Purchase] Fetching offerings...');
            const offerings = await Purchases.getOfferings();
            console.log('[Purchase] Offerings result:', JSON.stringify(offerings, null, 2));
            
            if (!offerings.current) {
                alert('DEBUG: No current offering found in RevenueCat. Please check your Offerings config and make sure one is set as "Current".');
                return 'free';
            }
            
            if (!offerings.current.availablePackages || offerings.current.availablePackages.length === 0) {
                alert('DEBUG: Offering found but no packages available. Check that products are linked to packages in RevenueCat.');
                return 'free';
            }
            
            console.log('[Purchase] Available packages:', offerings.current.availablePackages.length);
            offerings.current.availablePackages.forEach((pkg, i) => {
                console.log(`[Purchase] Package ${i}: ${pkg.identifier} - ${pkg.product?.title} - ${pkg.product?.priceString}`);
            });
            
            const targetIndex = (planIndex >= 0 && planIndex < offerings.current.availablePackages.length) ? planIndex : 0;
            console.log(`[Purchase] Attempting purchase of package index ${targetIndex}...`);
            
            const purchaseResult = await Purchases.purchasePackage({
                aPackage: offerings.current.availablePackages[targetIndex]
            });
            
            console.log('[Purchase] Purchase result:', JSON.stringify(purchaseResult, null, 2));
            
            const entitlement = purchaseResult.customerInfo?.entitlements?.active?.['pro_access'];
            if (entitlement) {
                const tier = this.detectTierFromEntitlement(entitlement) || (planIndex === 0 ? 'monthly' : 'annual');
                localStorage.setItem('taxsense_cached_tier', tier);
                return tier;
            }
            return 'free';
        } catch (e) {
            if (!e.userCancelled) {
                console.error('[Purchase] FULL ERROR:', JSON.stringify(e, null, 2));
                alert(`Purchase failed: ${e.message || e.code || JSON.stringify(e)}`);
            }
            return 'free';
        }
    }

    async restorePurchases() {
        if (this.mockMode) {
            alert('Mock Mode: No purchases to restore.');
            return 'free';
        }

        try {
            const customerInfo = await Purchases.restorePurchases();
            const entitlement = customerInfo.entitlements?.active?.['pro_access'];
            if (entitlement) {
                const tier = this.detectTierFromEntitlement(entitlement);
                localStorage.setItem('taxsense_cached_tier', tier);
                return tier;
            }
            return 'free';
        } catch (e) {
            console.error('Restore failed:', e);
            const cachedTier = localStorage.getItem('taxsense_cached_tier');
            return cachedTier || 'free';
        }
    }
}

export default new PurchaseService();
