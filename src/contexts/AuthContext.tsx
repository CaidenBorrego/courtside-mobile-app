import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../services/auth';
import { UserProfile } from '../types';

// Auth State Interface
export interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// Auth Actions
type AuthAction =
  | { type: 'AUTH_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; userProfile: UserProfile | null } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER_PROFILE'; payload: UserProfile };

// Auth Context Interface
interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refreshUserProfile: () => Promise<void>;
}

// Initial State
const initialState: AuthState = {
  user: null,
  userProfile: null,
  loading: true,
  error: null,
  isAuthenticated: false,
};

// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        userProfile: action.payload.userProfile,
        loading: false,
        error: null,
        isAuthenticated: true,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
        isAuthenticated: false,
      };
    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        loading: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER_PROFILE':
      return {
        ...state,
        userProfile: action.payload,
      };
    default:
      return state;
  }
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Sign In Function
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      
      const userCredential = await authService.signIn(email, password);
      const user = userCredential.user;
      
      // Fetch user profile
      const userProfile = await authService.getUserProfile(user.uid);
      
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, userProfile } 
      });
    } catch (error) {
      dispatch({ 
        type: 'AUTH_ERROR', 
        payload: error instanceof Error ? error.message : 'Sign in failed' 
      });
      throw error;
    }
  };

  // Sign Up Function
  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_LOADING' });
      
      const userCredential = await authService.signUp({
        email,
        password,
        displayName,
      });
      
      const user = userCredential.user;
      
      // Fetch the newly created user profile
      const userProfile = await authService.getUserProfile(user.uid);
      
      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, userProfile } 
      });
    } catch (error) {
      dispatch({ 
        type: 'AUTH_ERROR', 
        payload: error instanceof Error ? error.message : 'Sign up failed' 
      });
      throw error;
    }
  };

  // Sign Out Function
  const signOut = async (): Promise<void> => {
    try {
      await authService.signOut();
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      dispatch({ 
        type: 'AUTH_ERROR', 
        payload: error instanceof Error ? error.message : 'Sign out failed' 
      });
      throw error;
    }
  };

  // Clear Error Function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Refresh User Profile Function
  const refreshUserProfile = async (): Promise<void> => {
    if (state.user) {
      try {
        const userProfile = await authService.getUserProfile(state.user.uid);
        if (userProfile) {
          dispatch({ type: 'UPDATE_USER_PROFILE', payload: userProfile });
        }
      } catch (error) {
        console.error('Error refreshing user profile:', error);
      }
    }
  };

  // Auth State Listener Effect
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Fetch user profile when user is authenticated
          const userProfile = await authService.getUserProfile(user.uid);
          dispatch({ 
            type: 'AUTH_SUCCESS', 
            payload: { user, userProfile } 
          });
        } catch (error) {
          console.error('Error fetching user profile:', error);
          dispatch({ 
            type: 'AUTH_SUCCESS', 
            payload: { user, userProfile: null } 
          });
        }
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    });

    return unsubscribe;
  }, []);

  // Context Value
  const contextValue: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    clearError,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook to use Auth Context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;