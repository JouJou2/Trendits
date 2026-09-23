import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { db } from './firebase';

/**
 * Saved products, kept the same way as the website: on the device while
 * signed out, in the account once signed in, and anything saved beforehand
 * is folded into the account on the first sign-in.
 */

const STORAGE_KEY = 'trendit.wishlist.v1';

interface WishlistValue {
  ids: string[];
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [local, setLocal] = useState<string[]>([]);
  const [remote, setRemote] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const merged = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setLocal(JSON.parse(raw) as string[]); })
      .catch(err => console.error('Could not read saved products:', err))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(local)).catch(() => {});
  }, [local, loaded]);

  // Signed in: the account's own list.
  useEffect(() => {
    if (!user) {
      merged.current = false;
      setRemote([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'users', user.id, 'wishlist'),
      snap => setRemote(snap.docs.map(d => d.id)),
      err => console.error('Could not read your saved products:', err));
    return unsub;
  }, [user]);

  // First sign-in: move anything saved on the device into the account.
  useEffect(() => {
    if (!user || merged.current || local.length === 0) return;
    merged.current = true;
    const pending = [...local];
    setLocal([]);
    pending.forEach(id => {
      setDoc(doc(db, 'users', user.id, 'wishlist', id), {
        productId: id,
        addedAt: new Date().toISOString(),
      }).catch(err => console.error('Could not save a product to your account:', err));
    });
  }, [user, local]);

  const ids = user ? remote : local;

  const value = useMemo<WishlistValue>(() => ({
    ids,
    has: productId => ids.includes(productId),
    toggle: productId => {
      const saved = ids.includes(productId);
      if (user) {
        const ref = doc(db, 'users', user.id, 'wishlist', productId);
        const write = saved
          ? deleteDoc(ref)
          : setDoc(ref, { productId, addedAt: new Date().toISOString() });
        write.catch(err => console.error('Could not update your saved products:', err));
      } else {
        setLocal(prev => (saved ? prev.filter(id => id !== productId) : [...prev, productId]));
      }
    },
  }), [ids, user]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error('useWishlist must be used inside WishlistProvider');
  return value;
}
