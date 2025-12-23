import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  UserCredential,
  AuthError
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole } from '../../types';

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthServiceInterface {
  signIn(email: string, password: string): Promise<UserCredential>;
  signUp(data: SignUpData): Promise<UserCredential>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  createUserProfile(user: User, additionalData?: Partial<UserProfile>): Promise<void>;
  getUserProfile(uid: string): Promise<UserProfile | null>;
}

class AuthService implements AuthServiceInterface {
  /**
   * Sign in user with email and password
   */
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(this.getAuthErrorMessage(authError.code));
    }
  }

  /**
   * Sign up new user with email, password, and display name
   */
  async signUp(data: SignUpData): Promise<UserCredential> {
    try {
      const { email, password, displayName } = data;
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: displayName
      });

      // Create user profile document in Firestore
      await this.createUserProfile(userCredential.user, { displayName });

      return userCredential;
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(this.getAuthErrorMessage(authError.code));
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(this.getAuthErrorMessage(authError.code));
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Create user profile document in Firestore
   */
  async createUserProfile(user: User, additionalData: Partial<UserProfile> = {}): Promise<void> {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      const { displayName, email } = user;
      const createdAt = Timestamp.now();

      const userProfile: UserProfile = {
        id: user.uid,
        email: email || '',
        displayName: displayName || '',
        role: UserRole.USER,
        followingTeams: [],
        followingGames: [],
        // NOTIFICATIONS TEMPORARILY DISABLED
        // notificationsEnabled: true,
        createdAt: createdAt,
        lastActive: createdAt,
        ...additionalData
      };

      try {
        await setDoc(userRef, userProfile);
      } catch (error) {
        console.error('Error creating user profile:', error);
        throw new Error('Failed to create user profile');
      }
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        return userSnapshot.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Convert Firebase auth error codes to user-friendly messages
   */
  private getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default AuthService;