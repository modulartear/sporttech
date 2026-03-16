import { useEffect } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail, updatePassword as firebaseUpdatePassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../lib/firebase';
import { useAuthStore, type UserProfile } from '../stores/auth-store';

export function useAuth() {
  const { user, profile, isLoading, setUser, setProfile, setIsLoading, isAdmin, reset } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        await fetchOrCreateProfile(nextUser.uid, nextUser.displayName ?? undefined);
      } else {
        reset();
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchOrCreateProfile = async (uid: string, displayName?: string) => {
    try {
      const profileRef = doc(firestore, 'user_profiles', uid);
      const snap = await getDoc(profileRef);

      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
        return;
      }

      const newProfile: UserProfile = {
        full_name: displayName ?? 'User',
        role: 'user',
      };

      await setDoc(profileRef, {
        ...newProfile,
        email: firebaseAuth.currentUser?.email || '',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      setProfile(newProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { data: cred, error: null as any };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // Profile is created by fetchOrCreateProfile on auth state change, but we can set it now.
      const profileRef = doc(firestore, 'user_profiles', cred.user.uid);
      await setDoc(profileRef, {
        full_name: fullName,
        email: email,
        role: 'user',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return { data: cred, error: null as any };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(firebaseAuth);
      reset();
      return { error: null as any };
    } catch (error: any) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      return { data: true, error: null as any };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      if (!firebaseAuth.currentUser) {
        throw new Error('No authenticated user');
      }
      await firebaseUpdatePassword(firebaseAuth.currentUser, newPassword);
      return { data: true, error: null as any };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: isAdmin(),
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };
}
