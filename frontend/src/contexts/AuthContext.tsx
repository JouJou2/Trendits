import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, query, collection, where, limit, getDocs} from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { requestTwoFactorCode, submitTwoFactorCode } from '../services/twoFactorApi';

// Custom claim set by the backend once the account's email has been proven.
// This is a one-time gate, not a per-login step: email signups get the claim at
// account creation, and Google sign-ins get it the first time they verify. Once
// set it never expires, so returning users are never asked again.
const hasVerifiedEmail = (claims: Record<string, unknown>) =>
  typeof claims.tfaVerifiedAt === 'number';


export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'vendor' | 'admin' | 'super_admin';
  createdAt?: string;
  notifyOrders?: boolean;
  notifyDelivery?: boolean;
}

export interface VendorProfile {
  id: string;
  name: string;
  ownerId: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isVendor: boolean;
  isSuperAdmin: boolean;
  vendorId: string | null;
  vendorProfile: VendorProfile | null;
  needsTwoFactor: boolean;
  needsProfileCompletion: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  finalizeSignup: (email: string, password: string, name: string, phone: string) => Promise<void>;
  googleLogin: (remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendTwoFactorCode: () => Promise<void>;
  verifyTwoFactorCode: (code: string) => Promise<void>;
  completeProfile: (name: string, phone: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isVendor: false,
  isSuperAdmin: false,
  vendorId: null,
  vendorProfile: null,
  needsTwoFactor: false,
  needsProfileCompletion: false,
  login: async () => {},
  finalizeSignup: async () => {},
  googleLogin: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  sendTwoFactorCode: async () => {},
  verifyTwoFactorCode: async () => {},
  completeProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeVendor: (() => void) | null = null;

    unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Checked independently of the Firestore user-doc subscription below —
        // this only depends on the ID token's custom claims.
        firebaseUser.getIdTokenResult().then((tokenResult) => {
          setNeedsTwoFactor(!hasVerifiedEmail(tokenResult.claims));
        }).catch((e) => {
          console.error('Failed to check 2FA status:', e);
          setNeedsTwoFactor(true);
        });

        // Listen to user document for role changes. Tear down a listener from
        // a previous account first (Firebase can swap the signed-in user
        // without an intermediate null callback).
        if (unsubscribeUser) unsubscribeUser();
        unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
          let role: 'user' | 'vendor' | 'admin' | 'super_admin' = 'user';

          if (docSnap.exists()) {
            const userData = docSnap.data();
            role = userData.role || 'user';
            
            // Hardcoded override for Super Admin
            if (firebaseUser.email === 'get.corp.je@gmail.com' || firebaseUser.email === 'getcorp.je@gmail.com') {
              if (userData.role !== 'super_admin') {
                // Auto-sync role to Firestore if it's the super admin email
                const userRef = doc(db, 'users', firebaseUser.uid);
                updateDoc(userRef, { role: 'super_admin' }).catch(console.error);
              }
              role = 'super_admin';
            }

            // Keep the Firestore mirror in sync once a verifyBeforeUpdateEmail change completes
            if (firebaseUser.email && userData.email !== firebaseUser.email) {
              updateDoc(doc(db, 'users', firebaseUser.uid), { email: firebaseUser.email }).catch(console.error);
            }

            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.name || firebaseUser.displayName || 'User',
              phone: userData.phone || undefined,
              role: role,
              notifyOrders: userData.notifyOrders ?? true,
              notifyDelivery: userData.notifyDelivery ?? true,
            });

            // Google sign-ins (and any legacy account) never captured a phone —
            // prompt for it once. Admins are exempt so an owner can never be
            // locked out of the dashboard by this gate.
            const isStaff = role === "admin" || role === "super_admin";
            setNeedsProfileCompletion(!isStaff && !userData.phone);
          } else {
            // Hardcoded override for Super Admin
            if (firebaseUser.email === 'get.corp.je@gmail.com' || firebaseUser.email === 'getcorp.je@gmail.com') {
              role = 'super_admin';
              
              // Create the missing document with super_admin role
              const userRef = doc(db, 'users', firebaseUser.uid);
              setDoc(userRef, {
                name: firebaseUser.displayName || 'Super Admin',
                email: firebaseUser.email,
                role: 'super_admin',
                createdAt: new Date().toISOString()
              }).catch(console.error);
            }

            // Default if no doc exists yet
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || 'User',
              role: role,
              notifyOrders: true,
              notifyDelivery: true,
            });

            // Only 'user' or 'super_admin' can reach this branch.
            setNeedsProfileCompletion(role !== "super_admin");
          }

          // If the user is a vendor (not admin), look up their vendor profile
          
           // Lines ~120-150 — REPLACE with this:
if (role === 'vendor') {
  // This handler can re-fire on every user-doc update, so tear down the
  // previous vendor listener before attaching a new one.
  if (unsubscribeVendor) unsubscribeVendor();
  try {
    const vendorDocRef = doc(db, 'vendors', firebaseUser.uid);
    unsubscribeVendor = onSnapshot(vendorDocRef, async (vendorDoc) => {
      if (vendorDoc.exists()) {
        const vData = vendorDoc.data() as VendorProfile;
        setVendorId(vendorDoc.id);
        setVendorProfile({ ...vData, id: vendorDoc.id });
      } else {
        const vendorQuery = query(collection(db, 'vendors'), where('ownerId', '==', firebaseUser.uid), limit(1));
        const vendorSnap = await getDocs(vendorQuery);
        if (!vendorSnap.empty) {
          const first = vendorSnap.docs[0];
          const vData = first.data() as VendorProfile;
          setVendorId(first.id);
          setVendorProfile({ ...vData, id: first.id });
        } else {
          setVendorId(null);
          setVendorProfile(null);
        }
      }
    });
  } catch (e) {
    console.error('Vendor lookup error:', e);
    setVendorId(null);
    setVendorProfile(null);
  }
} else {
  if (unsubscribeVendor) { unsubscribeVendor(); unsubscribeVendor = null; }
  setVendorId(null);
  setVendorProfile(null);
}

setLoading(false);
        });
      } else {
        // Tear down listeners from the previous signed-in session — otherwise
        // they keep running with a null auth token and hit permission-denied.
        if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }
        if (unsubscribeVendor) { unsubscribeVendor(); unsubscribeVendor = null; }
        setUser(null);
        setVendorId(null);
        setVendorProfile(null);
        setNeedsTwoFactor(false);
        setNeedsProfileCompletion(false);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeVendor) unsubscribeVendor();
    };
  }, []);

  const login = async (email: string, password: string, remember: boolean = true) => {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Called after the backend has already created the Firebase Auth account
  // (post email-code verification) — this just signs in and writes the profile doc.
  const finalizeSignup = async (email: string, password: string, name: string, phone: string) => {
    await setPersistence(auth, browserLocalPersistence);
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      name,
      email,
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      role: (email === 'get.corp.je@gmail.com' || email === 'getcorp.je@gmail.com') ? 'super_admin' : 'user',
      createdAt: new Date().toISOString(),
    });
  };

  const googleLogin = async (remember: boolean = true) => {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const provider = new GoogleAuthProvider();
    const { user: firebaseUser } = await signInWithPopup(auth, provider);
    
    // Ensure user document exists
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email,
        role: (firebaseUser.email === 'get.corp.je@gmail.com' || firebaseUser.email === 'getcorp.je@gmail.com') ? 'super_admin' : 'user',
        createdAt: new Date().toISOString(),
      });
    }
  };

  const logout = async () => {
    await auth.signOut();
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Fills in the details a Google sign-in never collects. Update and create are
  // handled separately because the security rules validate them differently:
  // updates may only touch an allow-listed set of keys, while creates must carry
  // a full valid user document (name/email/role).
  const completeProfile = async (name: string, phone: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error('Not signed in.');
    const ref = doc(db, 'users', current.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await updateDoc(ref, {
        name: name.trim(),
        phone: phone.trim(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(ref, {
        name: name.trim(),
        phone: phone.trim(),
        email: current.email || '',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setNeedsProfileCompletion(false);
  };

  const sendTwoFactorCode = async () => {
    if (!auth.currentUser) throw new Error('Not signed in.');
    const idToken = await auth.currentUser.getIdToken();
    await requestTwoFactorCode(idToken);
  };

  const verifyTwoFactorCode = async (code: string) => {
    if (!auth.currentUser) throw new Error('Not signed in.');
    const idToken = await auth.currentUser.getIdToken();
    await submitTwoFactorCode(idToken, code);
    // Force-refresh so the freshly-set custom claim is reflected immediately —
    // a cached token would still show the pre-verification state.
    const refreshed = await auth.currentUser.getIdTokenResult(true);
    setNeedsTwoFactor(!hasVerifiedEmail(refreshed.claims));
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isVendor = user?.role === 'vendor' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isVendor, isSuperAdmin, vendorId, vendorProfile, needsTwoFactor, needsProfileCompletion, login, finalizeSignup, googleLogin, logout, resetPassword, sendTwoFactorCode, verifyTwoFactorCode, completeProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
