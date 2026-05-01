/**
 * Simple in-memory cache for Dashboard/Home data to speed up navigation.
 */

let dashboardCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export function getDashboardCache() {
    if (!dashboardCache) return null;
    
    // Check TTL
    if (Date.now() - lastFetchTime > CACHE_TTL) {
        dashboardCache = null;
        return null;
    }
    
    return dashboardCache;
}

export function setDashboardCache(data) {
    dashboardCache = data;
    lastFetchTime = Date.now();
}

export function invalidateDashboardCache() {
    dashboardCache = null;
    lastFetchTime = 0;
}
