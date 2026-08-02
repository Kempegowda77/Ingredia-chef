/**
 * cloudSync.js
 * Bidirectional sync between localStorage (fast cache) and Firestore (permanent cloud storage).
 * Strategy:
 *   - On login → fetch from Firestore, merge with localStorage, save merged result back.
 *   - On save/delete → write to both localStorage AND Firestore simultaneously.
 *   - Unauthenticated users: localStorage only (data survives until browser clear).
 */

import {
  db,
  auth,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from '../firebase';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCurrentUser() {
  return auth.currentUser;
}

// ─── SAVED RECIPES ───────────────────────────────────────────────────────────

/**
 * Load saved recipes:
 *  - If logged in → fetch from Firestore (cloud) and sync to localStorage
 *  - If not logged in → fall back to localStorage only
 */
export async function loadSavedFromCloud() {
  const user = getCurrentUser();
  const localData = JSON.parse(localStorage.getItem('ingredia_saved') || '[]');

  if (!user) return localData;

  try {
    const q = query(
      collection(db, 'saved_recipes'),
      where('userId', '==', user.uid)
    );
    const snapshot = await getDocs(q);
    const cloudData = snapshot.docs.map(d => ({ ...d.data(), _docId: d.id }));

    // Merge: cloud items win, supplement with any local-only items
    const cloudIds = new Set(cloudData.map(r => String(r.id)));
    const localOnly = localData.filter(r => !cloudIds.has(String(r.id)));
    const merged = [...cloudData, ...localOnly];

    // Persist merged back to localStorage as cache
    localStorage.setItem('ingredia_saved', JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('[cloudSync] loadSavedFromCloud failed, using localStorage:', err);
    return localData;
  }
}

/**
 * Save a recipe to Firestore + localStorage
 */
export async function saveRecipeToCloud(recipe) {
  const user = getCurrentUser();

  // Always update localStorage
  const current = JSON.parse(localStorage.getItem('ingredia_saved') || '[]');
  const alreadyExists = current.some(r => String(r.id) === String(recipe.id));
  const updated = alreadyExists ? current : [...current, recipe];
  localStorage.setItem('ingredia_saved', JSON.stringify(updated));

  if (!user) return updated;

  try {
    if (!alreadyExists) {
      const docRef = await addDoc(collection(db, 'saved_recipes'), {
        ...recipe,
        userId: user.uid,
        savedAt: serverTimestamp()
      });
      // Store the Firestore doc ID so we can delete it later
      const withDocId = updated.map(r =>
        String(r.id) === String(recipe.id) ? { ...r, _docId: docRef.id } : r
      );
      localStorage.setItem('ingredia_saved', JSON.stringify(withDocId));
      return withDocId;
    }
  } catch (err) {
    console.warn('[cloudSync] saveRecipeToCloud failed:', err);
  }
  return updated;
}

/**
 * Remove a recipe from Firestore + localStorage
 */
export async function removeRecipeFromCloud(recipeId) {
  const user = getCurrentUser();

  const current = JSON.parse(localStorage.getItem('ingredia_saved') || '[]');
  const target = current.find(r => String(r.id) === String(recipeId));
  const updated = current.filter(r => String(r.id) !== String(recipeId));
  localStorage.setItem('ingredia_saved', JSON.stringify(updated));

  if (!user) return updated;

  try {
    // Delete by Firestore doc ID if available, otherwise query by recipe id
    if (target?._docId) {
      await deleteDoc(doc(db, 'saved_recipes', target._docId));
    } else {
      const q = query(
        collection(db, 'saved_recipes'),
        where('userId', '==', user.uid),
        where('id', '==', recipeId)
      );
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref));
    }
  } catch (err) {
    console.warn('[cloudSync] removeRecipeFromCloud failed:', err);
  }
  return updated;
}

/**
 * Clear ALL saved recipes for the user
 */
export async function clearAllSavedFromCloud() {
  const user = getCurrentUser();
  localStorage.setItem('ingredia_saved', JSON.stringify([]));

  if (!user) return;

  try {
    const q = query(
      collection(db, 'saved_recipes'),
      where('userId', '==', user.uid)
    );
    const snap = await getDocs(q);
    snap.forEach(d => deleteDoc(d.ref));
  } catch (err) {
    console.warn('[cloudSync] clearAllSavedFromCloud failed:', err);
  }
}

// ─── COOKING HISTORY ─────────────────────────────────────────────────────────

/**
 * Load cooking history:
 *  - If logged in → fetch from Firestore, merge with localStorage
 *  - If not logged in → localStorage only
 */
export async function loadHistoryFromCloud() {
  const user = getCurrentUser();
  const localData = JSON.parse(localStorage.getItem('ingredia_history') || '[]');

  if (!user) return localData;

  try {
    const q = query(
      collection(db, 'cooking_history'),
      where('userId', '==', user.uid)
    );
    const snapshot = await getDocs(q);
    const cloudData = snapshot.docs.map(d => ({ ...d.data(), _docId: d.id }));

    // Merge: cloud items win, supplement with any local-only items not in cloud
    const cloudIds = new Set(cloudData.map(r => String(r.id)));
    const localOnly = localData.filter(r => !cloudIds.has(String(r.id)));
    const merged = [...cloudData, ...localOnly]
      .sort((a, b) => b.id - a.id) // newest first
      .slice(0, 50);               // cap at 50

    localStorage.setItem('ingredia_history', JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('[cloudSync] loadHistoryFromCloud failed, using localStorage:', err);
    return localData;
  }
}

/**
 * Save a history entry to Firestore + localStorage
 */
export async function saveHistoryToCloud(entry) {
  const user = getCurrentUser();

  const current = JSON.parse(localStorage.getItem('ingredia_history') || '[]');
  const updated = [entry, ...current.filter(h => h.title !== entry.title)].slice(0, 50);
  localStorage.setItem('ingredia_history', JSON.stringify(updated));

  if (!user) return updated;

  try {
    const docRef = await addDoc(collection(db, 'cooking_history'), {
      ...entry,
      userId: user.uid,
      cookedAt: serverTimestamp()
    });
    const withDocId = updated.map(r =>
      String(r.id) === String(entry.id) ? { ...r, _docId: docRef.id } : r
    );
    localStorage.setItem('ingredia_history', JSON.stringify(withDocId));
    return withDocId;
  } catch (err) {
    console.warn('[cloudSync] saveHistoryToCloud failed:', err);
    return updated;
  }
}

/**
 * Delete a single history entry from Firestore + localStorage
 */
export async function removeHistoryEntryFromCloud(entryId) {
  const user = getCurrentUser();

  const current = JSON.parse(localStorage.getItem('ingredia_history') || '[]');
  const target = current.find(h => String(h.id) === String(entryId));
  const updated = current.filter(h => String(h.id) !== String(entryId));
  localStorage.setItem('ingredia_history', JSON.stringify(updated));

  if (!user) return updated;

  try {
    if (target?._docId) {
      await deleteDoc(doc(db, 'cooking_history', target._docId));
    } else {
      const q = query(
        collection(db, 'cooking_history'),
        where('userId', '==', user.uid),
        where('id', '==', entryId)
      );
      const snap = await getDocs(q);
      snap.forEach(d => deleteDoc(d.ref));
    }
  } catch (err) {
    console.warn('[cloudSync] removeHistoryEntryFromCloud failed:', err);
  }
  return updated;
}

/**
 * Clear ALL history entries for the user
 */
export async function clearAllHistoryFromCloud() {
  const user = getCurrentUser();
  localStorage.setItem('ingredia_history', JSON.stringify([]));

  if (!user) return;

  try {
    const q = query(
      collection(db, 'cooking_history'),
      where('userId', '==', user.uid)
    );
    const snap = await getDocs(q);
    snap.forEach(d => deleteDoc(d.ref));
  } catch (err) {
    console.warn('[cloudSync] clearAllHistoryFromCloud failed:', err);
  }
}
