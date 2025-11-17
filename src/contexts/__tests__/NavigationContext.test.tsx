import { useNavigation } from '../NavigationContext';

// Mock React context
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

describe('NavigationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error when used outside provider', () => {
    const React = require('react');
    React.useContext.mockReturnValue(undefined);

    expect(() => {
      useNavigation();
    }).toThrow('useNavigation must be used within a NavigationProvider');
  });

  it('should return context value when used within provider', () => {
    const React = require('react');
    const mockContext = {
      navigationRef: { current: null },
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(),
    };
    React.useContext.mockReturnValue(mockContext);

    const result = useNavigation();

    expect(result).toEqual(mockContext);
    expect(result.navigationRef).toBeDefined();
    expect(typeof result.navigate).toBe('function');
    expect(typeof result.goBack).toBe('function');
    expect(typeof result.canGoBack).toBe('function');
  });
});
