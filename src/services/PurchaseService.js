import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

const REVENUECAT_API_KEY = 'appl_QCUkEjYUzWxEVwEMWJyneKlJTfj'; 
const USE_REAL_PAYMENTS = true; // Toggle this to true for final App Store submission

class PurchaseService {
    constructor() {
        this.isInitialized = false;
        this.mockMode = false; // Real payments - mock mode disabled
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Check if we are running on a real device and have a real key
            if (USE_REAL_PAYMENTS && REVENUECAT_API_KEY !== 'REPLACE_WITH_YOUR_KEY' && (window.Capacitor?.getPlatform() === 'ios' || window.Capacitor?.getPlatform() === 'android')) {
                await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
                await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
                this.mockMode = false;
                console.log('RevenueCat initialized successfully (REAL MODE)');
            } else {
                console.log(`RevenueCat: Running in Mock Mode (${USE_REAL_PAYMENTS ? 'Web/Missing Key' : 'FORCED'})`);
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
            await Purchases.logIn({ appUserID: userId });
            console.log('RevenueCat: Identified user:', userId);
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
            const mockTier = localStorage.getItem('taxsense_pro_mock_tier');
            return mockTier ? mockTier : 'free';
        }

        // Primary: check customer info for logged-in user (identifyUser runs before this)
        // RevenueCat auto-links purchases to the logged-in user, so getCustomerInfo
        // is sufficient — no need for restorePurchases on every launch.
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const customerInfo = await Purchases.getCustomerInfo();
                const entitlement = customerInfo.entitlements.active['pro_access'];
                if (entitlement) {
                    const tier = this.detectTierFromEntitlement(entitlement);
                    localStorage.setItem('taxsense_cached_tier', tier);
                    return tier;
                }
                // No active entitlement found from server — break to fallbacks
                break;
            } catch (infoErr) {
                console.warn(`[RevenueCat] Customer info check failed (attempt ${attempt + 1}):`, infoErr.message || infoErr);
                // On first failure wait briefly then retry (SDK may still be syncing)
                if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
            }
        }

        // Fallback: check locally cached tier (survives app updates via iOS sandbox)
        const cachedTier = localStorage.getItem('taxsense_cached_tier');
        if (cachedTier && cachedTier !== 'free') {
            console.log('[RevenueCat] Using cached tier:', cachedTier);
            return cachedTier;
        }

        return 'free';
    }

    async purchasePro(planIndex = 0) {
        if (this.mockMode) {
            // Simulate a successful purchase for testing
            return new Promise((resolve) => {
                setTimeout(() => {
                    // Store the specific tier so checkSubscriptionStatus works
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
            
            if (purchaseResult.customerInfo.entitlements.active['pro_access']) {
                const tier = planIndex === 0 ? 'monthly' : 'annual';
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
            const entitlement = customerInfo.entitlements.active['pro_access'];
            if (entitlement) {
                const tier = this.detectTierFromEntitlement(entitlement);
                localStorage.setItem('taxsense_cached_tier', tier);
                return tier;
            }
            return 'free';
        } catch (e) {
            console.error('Restore failed:', e);
            // Check cached tier as fallback
            const cachedTier = localStorage.getItem('taxsense_cached_tier');
            return cachedTier || 'free';
        }
    }
}

export default new PurchaseService();
