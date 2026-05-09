import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setProfile: (profile: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  setProfile: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    localStorage.removeItem('demo_user_profile');
    try {
      await auth.signOut();
    } catch(e) {}
    window.location.reload();
  };

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // Clear previous snapshot listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }
      
      if (authUser) {
        setUser(authUser);
        profileUnsubscribe = onSnapshot(doc(db, 'users', authUser.uid), (userDoc) => {
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
             setProfile(null);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'users/' + authUser.uid);
        });
      } else {
        const localDemoUser = localStorage.getItem('demo_user_profile');
        if (localDemoUser) {
          const demoProfile = JSON.parse(localDemoUser);
          setUser({ uid: 'demo-local-user' } as User);
          
          profileUnsubscribe = onSnapshot(doc(db, 'users', 'demo-local-user'), (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data() as UserProfile;
              setProfile({...data, updatedAt: data.updatedAt || new Date().toISOString()} as UserProfile);
              localStorage.setItem('demo_user_profile', JSON.stringify(data));
            } else {
              setProfile(demoProfile); // fallback if deleted
            }
          }, (err) => {
             handleFirestoreError(err, OperationType.GET, 'users/demo-local-user');
          });
          
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
