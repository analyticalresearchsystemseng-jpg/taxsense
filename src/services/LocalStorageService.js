/**
 * Local Storage Service for TaxSense
 * Replaces Firebase Firestore with IndexedDB + localStorage
 */

const DB_NAME = 'TaxSenseDB';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get all profiles for a user
 */
export async function getProfiles(userId = 'local-user') {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(userId);
      
      request.onsuccess = () => {
        const result = request.result;
        db.close();
        if (result && result.profiles) {
          resolve(result.profiles);
        } else {
          // Try localStorage fallback
          const localData = localStorage.getItem('taxSenseData_v2_Profiles');
          resolve(localData ? JSON.parse(localData) : {});
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // Fallback to localStorage if IndexedDB fails
    const localData = localStorage.getItem('taxSenseData_v2_Profiles');
    return localData ? JSON.parse(localData) : {};
  }
}

/**
 * Save profiles for a user
 */
export async function saveProfiles(profiles, userId = 'local-user') {
  try {
    const db = await initDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id: userId, profiles, updatedAt: Date.now() });
      
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB failed, using localStorage:', error);
  }
  
  // Always backup to localStorage
  localStorage.setItem('taxSenseData_v2_Profiles', JSON.stringify(profiles));
}

/**
 * Delete all user data
 */
export async function deleteUserData(userId = 'local-user') {
  try {
    const db = await initDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(userId);
      
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('IndexedDB delete failed:', error);
  }
  
  // Clear localStorage
  localStorage.removeItem('taxSenseData_v2_Profiles');
  localStorage.removeItem('taxSense_activeYear');
}

/**
 * Check if this is a first launch after Firebase removal
 */
export function isFirstLaunchAfterFirebaseRemoval() {
  return !localStorage.getItem('taxSense_migrated_from_firebase');
}

/**
 * Mark migration as complete
 */
export function markFirebaseMigrationComplete() {
  localStorage.setItem('taxSense_migrated_from_firebase', 'true');
}

/**
 * Check if any local data exists (for migration detection)
 */
export function hasLocalData() {
  const indexedDBExists = !!localStorage.getItem('taxSenseData_v2_Profiles');
  return indexedDBExists;
}

/**
 * Export data for backup
 */
export function exportData() {
  const data = localStorage.getItem('taxSenseData_v2_Profiles');
  return data ? JSON.parse(data) : null;
}

/**
 * Import data from backup
 */
export async function importData(data) {
  if (data && typeof data === 'object') {
    await saveProfiles(data);
    return true;
  }
  return false;
}
