// Mock Firebase Timestamp
export const mockTimestamp = {
  fromDate: (date: Date) => ({
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toMillis: () => date.getTime(),
    isEqual: (other: any) => date.getTime() === other.toMillis(),
    valueOf: () => date.toISOString(),
    toJSON: () => ({ 
      seconds: Math.floor(date.getTime() / 1000), 
      nanoseconds: 0,
      type: 'timestamp'
    }),
  }),
  now: () => ({
    toDate: () => new Date(),
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
    toMillis: () => Date.now(),
    isEqual: (other: any) => Date.now() === other.toMillis(),
    valueOf: () => new Date().toISOString(),
    toJSON: () => ({ 
      seconds: Math.floor(Date.now() / 1000), 
      nanoseconds: 0,
      type: 'timestamp'
    }),
  }),
};

// Mock Firebase
jest.mock('../services/firebase/config', () => ({
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    updateProfile: jest.fn(),
  },
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
  },
  messaging: null,
}));

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  updateProfile: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendEmailVerification: jest.fn(),
  updateEmail: jest.fn(),
  updatePassword: jest.fn(),
  deleteUser: jest.fn(),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  Timestamp: mockTimestamp,
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  setDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  writeBatch: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock React Native Paper
jest.mock('react-native-paper', () => ({
  ...jest.requireActual('react-native-paper'),
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    getAllKeys: jest.fn(),
    multiGet: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock fetch for Firebase
global.fetch = jest.fn();

// Mock Response for Firebase Auth
global.Response = class Response {
  constructor(public body: any, public init?: ResponseInit) {}
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
  text() {
    return Promise.resolve(this.body);
  }
} as any;

// Mock Request for Firebase Auth
global.Request = class Request {
  constructor(public url: string, public init?: RequestInit) {}
} as any;

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};