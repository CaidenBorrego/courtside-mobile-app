// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `exp://localhost:8081${path}`),
}));

import linking from '../linking';

describe('linking configuration', () => {
  it('should have correct prefixes', () => {
    expect(linking.prefixes).toBeDefined();
    expect(linking.prefixes).toContain('courtside://');
    expect(linking.prefixes).toContain('https://courtside.app');
  });

  it('should have correct screen configuration', () => {
    expect(linking.config).toBeDefined();
    expect(linking.config?.screens).toBeDefined();
  });

  it('should configure Auth screens', () => {
    const authScreens = linking.config?.screens.Auth as any;
    expect(authScreens).toBeDefined();
    expect(authScreens.screens).toBeDefined();
    expect(authScreens.screens.Login).toBe('login');
    expect(authScreens.screens.Register).toBe('register');
  });

  it('should configure Main screens', () => {
    const mainScreens = linking.config?.screens.Main as any;
    expect(mainScreens).toBeDefined();
    expect(mainScreens.screens).toBeDefined();
    expect(mainScreens.screens.Home).toBe('home');
    expect(mainScreens.screens.Profile).toBe('profile');
  });

  it('should configure TournamentDetail screen with parameter', () => {
    const tournamentDetail = linking.config?.screens.TournamentDetail as any;
    expect(tournamentDetail).toBeDefined();
    expect(tournamentDetail.path).toBe('tournament/:tournamentId');
    expect(tournamentDetail.parse).toBeDefined();
    expect(tournamentDetail.parse.tournamentId).toBeDefined();
  });

  it('should configure GameDetail screen with parameter', () => {
    const gameDetail = linking.config?.screens.GameDetail as any;
    expect(gameDetail).toBeDefined();
    expect(gameDetail.path).toBe('game/:gameId');
    expect(gameDetail.parse).toBeDefined();
    expect(gameDetail.parse.gameId).toBeDefined();
  });

  it('should parse tournamentId correctly', () => {
    const tournamentDetail = linking.config?.screens.TournamentDetail as any;
    const parsedId = tournamentDetail.parse.tournamentId('test-tournament-123');
    expect(parsedId).toBe('test-tournament-123');
  });

  it('should parse gameId correctly', () => {
    const gameDetail = linking.config?.screens.GameDetail as any;
    const parsedId = gameDetail.parse.gameId('test-game-456');
    expect(parsedId).toBe('test-game-456');
  });
});
