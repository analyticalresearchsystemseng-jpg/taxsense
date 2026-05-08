/**
 * Local Storage Service for TaxSense
 * Replaces Firebase Firestore with IndexedDB + localStorage
 * Includes photo storage and backup/restore functionality
 */

const DB_NAME = 'TaxSenseDB';
const DB_VERSION = 2; // Bumped for photo store support
const STORE_NAME = 'profiles';
const PHOTO_STORE = 'photos';

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
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, { keyPath: 'id' });
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
  } catch {
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
      const transaction = db.transaction([STORE_NAME, PHOTO_STORE], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const photoStore = transaction.objectStore(PHOTO_STORE);
      store.delete(userId);
      const photoRequest = photoStore.getAllKeys();
      photoRequest.onsuccess = () => {
        (photoRequest.result || []).forEach(key => photoStore.delete(key));
      };
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('IndexedDB delete failed:', error);
  }
  
  // Clear localStorage
  localStorage.removeItem('taxSenseData_v2_Profiles');
  localStorage.removeItem('taxSense_activeYear');
  localStorage.removeItem('taxSense_lastBackupDate');
  localStorage.removeItem('taxSense_backupReminderDismissed');
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
 * Save a receipt photo to IndexedDB
 * @param {string} photoId - Unique ID for the photo
 * @param {string} base64Data - Base64 image data
 */
export async function savePhoto(photoId, base64Data) {
  try {
    const db = await initDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(PHOTO_STORE, 'readwrite');
      const store = transaction.objectStore(PHOTO_STORE);
      const request = store.put({ id: photoId, data: base64Data, createdAt: Date.now() });
      
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    return true;
  } catch (error) {
    console.warn('Photo save failed:', error);
    return false;
  }
}

/**
 * Get a receipt photo from IndexedDB
 * @param {string} photoId - Unique ID for the photo
 */
export async function getPhoto(photoId) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PHOTO_STORE, 'readonly');
      const store = transaction.objectStore(PHOTO_STORE);
      const request = store.get(photoId);
      
      request.onsuccess = () => {
        const result = request.result;
        db.close();
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Photo retrieval failed:', error);
    return null;
  }
}

/**
 * Delete a receipt photo from IndexedDB
 * @param {string} photoId - Unique ID for the photo
 */
export async function deletePhoto(photoId) {
  try {
    const db = await initDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(PHOTO_STORE, 'readwrite');
      const store = transaction.objectStore(PHOTO_STORE);
      const request = store.delete(photoId);
      
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
    return true;
  } catch (error) {
    console.warn('Photo delete failed:', error);
    return false;
  }
}

/**
 * Build a full app backup object (profiles + localStorage + photos metadata)
 */
export async function buildFullBackup() {
  const profiles = await getProfiles('local-user');
  const backup = {
    version: 'TaxSense-Backup-v1',
    exportedAt: new Date().toISOString(),
    profiles,
    localStorage: {}
  };
  
  // Capture relevant localStorage keys
  const keysToBackup = [
    'theme',
    'taxSense_activeYear',
    'taxSense_migrated_from_firebase'
  ];
  keysToBackup.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) backup.localStorage[key] = val;
  });
  
  // Photo metadata only (photos themselves stay in IndexedDB; user exports separately if needed)
  try {
    const db = await initDB();
    const photoMeta = await new Promise((resolve, reject) => {
      const transaction = db.transaction(PHOTO_STORE, 'readonly');
      const store = transaction.objectStore(PHOTO_STORE);
      const request = store.getAllKeys();
      request.onsuccess = () => {
        db.close();
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
    backup.photoIds = photoMeta;
  } catch {
    backup.photoIds = [];
  }
  
  return backup;
}

/**
 * Export data for backup (manual JSON export)
 */
export async function exportBackup() {
  const backup = await buildFullBackup();
  const json = JSON.stringify(backup, null, 2);
  
  // Update last backup date
  localStorage.setItem('taxSense_lastBackupDate', new Date().toISOString());
  
  return json;
}

/**
 * Import data from backup JSON string
 */
export async function importBackup(jsonString) {
  try {
    const backup = JSON.parse(jsonString);
    
    // Validate backup structure
    if (!backup || !backup.version || !backup.profiles || typeof backup.profiles !== 'object') {
      return { success: false, error: 'Invalid backup file format' };
    }
    
    // Restore profiles
    await saveProfiles(backup.profiles, 'local-user');
    
    // Restore localStorage
    if (backup.localStorage && typeof backup.localStorage === 'object') {
      Object.entries(backup.localStorage).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
    }
    
    // Note: Photos are not restored from backup JSON since base64 strings would be huge.
    // Photos stay in the device's IndexedDB and survive app updates.
    // If user needs full photo migration, they should use device-level backup (iCloud).
    
    return { success: true, profileCount: Object.keys(backup.profiles).length };
  } catch (error) {
    console.error('Backup import failed:', error);
    return { success: false, error: error.message || 'Failed to parse backup file' };
  }
}

/**
 * Get last backup date
 */
export function getLastBackupDate() {
  const date = localStorage.getItem('taxSense_lastBackupDate');
  return date ? new Date(date) : null;
}

/**
 * Check if weekly backup reminder should show
 */
export function shouldShowBackupReminder() {
  const lastBackup = localStorage.getItem('taxSense_lastBackupDate');
  if (!lastBackup) return true;
  
  const dismissed = localStorage.getItem('taxSense_backupReminderDismissed');
  if (dismissed) {
    const dismissedDate = new Date(dismissed);
    const now = new Date();
    // Reset dismissal after 7 days
    if ((now - dismissedDate) > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('taxSense_backupReminderDismissed');
      return true;
    }
    return false;
  }
  
  const lastDate = new Date(lastBackup);
  const now = new Date();
  const daysSinceBackup = (now - lastDate) / (1000 * 60 * 60 * 24);
  return daysSinceBackup >= 7;
}

/**
 * Dismiss backup reminder
 */
export function dismissBackupReminder() {
  localStorage.setItem('taxSense_backupReminderDismissed', new Date().toISOString());
}

// Legacy exports for backward compatibility
export function exportData() {
  const data = localStorage.getItem('taxSenseData_v2_Profiles');
  return data ? JSON.parse(data) : null;
}

export async function importData(data) {
  if (data && typeof data === 'object') {
    await saveProfiles(data);
    return true;
  }
  return false;
}
