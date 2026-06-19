import { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'vendor' | 'admin' | 'super_admin';
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isVendor: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isVendor: false,
  isSuperAdmin: false,
  login: async () => {},
  register: async () => {},
  googleLogin: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Listen to user document for role changes
        const unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            let role = userData.role || 'user';
            
            // Hardcoded override for Super Admin
            if (firebaseUser.email === 'get.corp.je@gmail.com' || firebaseUser.email === 'getcorp.je@gmail.com') {
              if (userData.role !== 'super_admin') {
                // Auto-sync role to Firestore if it's the super admin email
                const userRef = doc(db, 'users', firebaseUser.uid);
                updateDoc(userRef, { role: 'super_admin' }).catch(console.error);
              }
              role = 'super_admin';
            }

            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData.name || firebaseUser.displayName || 'User',
              role: role as 'user' | 'vendor' | 'admin' | 'super_admin',
            });
          } else {
            let role: 'user' | 'super_admin' = 'user';
            
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
            });
          }
          setLoading(false);
        });

        return () => unsubscribeUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (name: string, email: string, password: string) => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    // Create user doc in firestore
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      name,
      email,
      role: (email === 'get.corp.je@gmail.com' || email === 'getcorp.je@gmail.com') ? 'super_admin' : 'user',
      createdAt: new Date().toISOString(),
    });
  };

  const googleLogin = async () => {
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

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isVendor = user?.role === 'vendor' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isVendor, isSuperAdmin, login, register, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
