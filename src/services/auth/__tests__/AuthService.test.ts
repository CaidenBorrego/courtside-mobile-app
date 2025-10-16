import { authService } from '../AuthService';
import { auth, db } from '../../firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Mock Firebase functions
jest.mock('firebase/auth');
jest.mock('firebase/firestore');
jest.mock('../../firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

const mockSignInWithEmailAndPassword = signInWithEmailAndPassword as jest.MockedFunction<typeof signInWithEmailAndPassword>;
const mockCreateUserWithEmailAndPassword = createUserWithEmailAndPassword as jest.MockedFunction<typeof createUserWithEmailAndPassword>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>;
const mockUpdateProfile = updateProfile as jest.MockedFunction<typeof updateProfile>;
const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;

// Mock user object
const mockUser: Partial<User> = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User',
};

const mockUserCredential: UserCredential = {
  user: mockUser as User,
  providerId: null,
  operationType: 'signIn',
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      mockSignInWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const result = await authService.signIn('test@example.com', 'password123');

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'test@example.com',
        'password123'
      );
      expect(result).toEqual(mockUserCredential);
    });

    it('should throw error for invalid credentials', async () => {
      const authError = new Error('Invalid credentials');
      (authError as any).code = 'auth/invalid-credential';
      mockSignInWithEmailAndPassword.mockRejectedValue(authError);

      await expect(authService.signIn('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid email or password. Please try again.');
    });

    it('should throw error for user not found', async () => {
      const authError = new Error('User not found');
      (authError as any).code = 'auth/user-not-found';
      mockSignInWithEmailAndPassword.mockRejectedValue(authError);

      await expect(authService.signIn('nonexistent@example.com', 'password123'))
        .rejects.toThrow('No account found with this email address.');
    });
  });

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);
      mockUpdateProfile.mockResolvedValue();
      mockDoc.mockReturnValue({} as any);
      mockGetDoc.mockResolvedValue({ exists: () => false } as any);
      mockSetDoc.mockResolvedValue();

      const signUpData = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      };

      const result = await authService.signUp(signUpData);

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'test@example.com',
        'password123'
      );
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'Test User',
      });
      expect(result).toEqual(mockUserCredential);
    });

    it('should throw error for email already in use', async () => {
      const authError = new Error('Email already in use');
      (authError as any).code = 'auth/email-already-in-use';
      mockCreateUserWithEmailAndPassword.mockRejectedValue(authError);

      const signUpData = {
        email: 'existing@example.com',
        password: 'password123',
        displayName: 'Test User',
      };

      await expect(authService.signUp(signUpData))
        .rejects.toThrow('An account with this email already exists.');
    });

    it('should throw error for weak password', async () => {
      const authError = new Error('Weak password');
      (authError as any).code = 'auth/weak-password';
      mockCreateUserWithEmailAndPassword.mockRejectedValue(authError);

      const signUpData = {
        email: 'test@example.com',
        password: '123',
        displayName: 'Test User',
      };

      await expect(authService.signUp(signUpData))
        .rejects.toThrow('Password should be at least 6 characters long.');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSignOut.mockResolvedValue();

      await authService.signOut();

      expect(mockSignOut).toHaveBeenCalledWith(auth);
    });

    it('should handle sign out error', async () => {
      const authError = new Error('Sign out failed');
      (authError as any).code = 'auth/network-request-failed';
      mockSignOut.mockRejectedValue(authError);

      await expect(authService.signOut())
        .rejects.toThrow('Network error. Please check your connection and try again.');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', () => {
      (auth as any).currentUser = mockUser;

      const result = authService.getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when no user is signed in', () => {
      (auth as any).currentUser = null;

      const result = authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('onAuthStateChanged', () => {
    it('should set up auth state listener', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();
      mockOnAuthStateChanged.mockReturnValue(unsubscribe);

      const result = authService.onAuthStateChanged(callback);

      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(auth, callback);
      expect(result).toBe(unsubscribe);
    });
  });

  describe('createUserProfile', () => {
    it('should create user profile when user does not exist', async () => {
      const mockDocRef = {};
      const mockSnapshot = { exists: () => false };
      
      mockDoc.mockReturnValue(mockDocRef as any);
      mockGetDoc.mockResolvedValue(mockSnapshot as any);
      mockSetDoc.mockResolvedValue();

      await authService.createUserProfile(mockUser as User);

      expect(mockDoc).toHaveBeenCalledWith(db, 'users', 'test-uid');
      expect(mockGetDoc).toHaveBeenCalledWith(mockDocRef);
      expect(mockSetDoc).toHaveBeenCalledWith(mockDocRef, expect.objectContaining({
        id: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
        followingTeams: [],
        followingGames: [],
        notificationsEnabled: true,
      }));
    });

    it('should not create profile when user already exists', async () => {
      const mockDocRef = {};
      const mockSnapshot = { exists: () => true };
      
      mockDoc.mockReturnValue(mockDocRef as any);
      mockGetDoc.mockResolvedValue(mockSnapshot as any);

      await authService.createUserProfile(mockUser as User);

      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile when it exists', async () => {
      const mockProfile = {
        id: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
      };
      
      const mockDocRef = {};
      const mockSnapshot = {
        exists: () => true,
        data: () => mockProfile,
      };
      
      mockDoc.mockReturnValue(mockDocRef as any);
      mockGetDoc.mockResolvedValue(mockSnapshot as any);

      const result = await authService.getUserProfile('test-uid');

      expect(mockDoc).toHaveBeenCalledWith(db, 'users', 'test-uid');
      expect(result).toEqual(mockProfile);
    });

    it('should return null when profile does not exist', async () => {
      const mockDocRef = {};
      const mockSnapshot = { exists: () => false };
      
      mockDoc.mockReturnValue(mockDocRef as any);
      mockGetDoc.mockResolvedValue(mockSnapshot as any);

      const result = await authService.getUserProfile('test-uid');

      expect(result).toBeNull();
    });
  });
});