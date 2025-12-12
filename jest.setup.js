// Mock Expo winter runtime to prevent import scope errors
// This MUST be done before any other imports or setup
jest.mock('expo/src/winter/runtime.native.ts', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal.ts', () => ({}), { virtual: true });

// Mock Firebase
jest.mock('firebase/app', () => ({
  FirebaseError: class FirebaseError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
      this.name = 'FirebaseError';
    }
  },
}));
