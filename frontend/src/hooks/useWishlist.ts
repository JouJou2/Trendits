import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const LOCAL_KEY = 'trendit_wishlist';

const readLocalWishlist = (): (string | number)[] => {
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error parsing wishlist from localStorage', e);
    return [];
  }
};

const normalizeId = (productId: number | string): string | number =>
  typeof productId === 'number' ? productId : (isNaN(Number(productId)) ? productId : Number(productId));

export function useWishlist() {
  const { user } = useAuth();
  const [localWishlist, setLocalWishlist] = useState<(string | number)[]>(readLocalWishlist);
  const [firestoreWishlist, setFirestoreWishlist] = useState<(string | number)[]>([]);
  const mergedRef = useRef(false);

  // Guests: persist favorites on this device
  useEffect(() => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(localWishlist));
  }, [localWishlist]);

  // Logged in: subscribe to the account's wishlist subcollection
  useEffect(() => {
    if (!user) {
      mergedRef.current = false;
      setFirestoreWishlist([]);
      return;
    }
    const unsub = onSnapshot(collection(db, 'users', user.id, 'wishlist'), (snap) => {
      setFirestoreWishlist(snap.docs.map(d => normalizeId(d.id)));
    });
    return () => unsub();
  }, [user]);

  // One-time merge: fold any favorites saved as a guest into the account on login
  useEffect(() => {
    if (!user || mergedRef.current || localWishlist.length === 0) return;
    mergedRef.current = true;
    const toMerge = [...localWishlist];
    setLocalWishlist([]);
    toMerge.forEach(id => {
      setDoc(doc(db, 'users', user.id, 'wishlist', id.toString()), {
        productId: id,
        addedAt: new Date().toISOString(),
      }).catch(() => {});
    });
  }, [user, localWishlist]);

  const wishlist = user ? firestoreWishlist : localWishlist;

  const toggleWishlist = (productId: number | string) => {
    const id = normalizeId(productId);

    if (user) {
      const ref = doc(db, 'users', user.id, 'wishlist', id.toString());
      if (firestoreWishlist.includes(id)) {
        deleteDoc(ref).catch(() => {});
      } else {
        setDoc(ref, { productId: id, addedAt: new Date().toISOString() }).catch(() => {});
      }
      return;
    }

    setLocalWishlist((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const isInWishlist = (productId: number | string) => wishlist.includes(normalizeId(productId));

  return { wishlist, toggleWishlist, isInWishlist };
}
