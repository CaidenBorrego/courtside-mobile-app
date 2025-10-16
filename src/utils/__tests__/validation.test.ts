import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateRequired,
  validatePhoneNumber,
  validateTournamentName,
  validateTeamName,
  validateScore,
  validateLoginForm,
  validateRegistrationForm,
  isGameStatus,
  isTournamentStatus,
  isUserRole,
  isGender,
} from '../validation';
import { GameStatus, TournamentStatus, UserRole, Gender } from '../../types';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test.example.com')).toBe(false);
      expect(validateEmail('test @example.com')).toBe(false);
    });

    it('should handle email with whitespace', () => {
      expect(validateEmail(' test@example.com ')).toBe(true);
      expect(validateEmail('  ')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate passwords with minimum length', () => {
      expect(validatePassword('123456')).toBe(true);
      expect(validatePassword('password123')).toBe(true);
      expect(validatePassword('P@ssw0rd!')).toBe(true);
    });

    it('should reject passwords that are too short', () => {
      expect(validatePassword('')).toBe(false);
      expect(validatePassword('12345')).toBe(false);
      expect(validatePassword('abc')).toBe(false);
    });
  });

  describe('validateDisplayName', () => {
    it('should validate correct display names', () => {
      expect(validateDisplayName('John')).toBe(true);
      expect(validateDisplayName('John Doe')).toBe(true);
      expect(validateDisplayName('User123')).toBe(true);
      expect(validateDisplayName('A'.repeat(50))).toBe(true);
    });

    it('should reject invalid display names', () => {
      expect(validateDisplayName('')).toBe(false);
      expect(validateDisplayName('A')).toBe(false);
      expect(validateDisplayName('A'.repeat(51))).toBe(false);
    });

    it('should handle display names with whitespace', () => {
      expect(validateDisplayName(' John ')).toBe(true);
      expect(validateDisplayName('  ')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty strings', () => {
      expect(validateRequired('test')).toBe(true);
      expect(validateRequired('123')).toBe(true);
      expect(validateRequired(' content ')).toBe(true);
    });

    it('should reject empty or whitespace-only strings', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired('\t\n')).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('1234567890')).toBe(true);
      expect(validatePhoneNumber('+1 (555) 123-4567')).toBe(true);
      expect(validatePhoneNumber('+44 20 7946 0958')).toBe(true);
      expect(validatePhoneNumber('555-123-4567')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('abc-def-ghij')).toBe(false);
    });
  });

  describe('validateTournamentName', () => {
    it('should validate correct tournament names', () => {
      expect(validateTournamentName('Summer Basketball Tournament')).toBe(true);
      expect(validateTournamentName('NBA')).toBe(true);
      expect(validateTournamentName('A'.repeat(100))).toBe(true);
    });

    it('should reject invalid tournament names', () => {
      expect(validateTournamentName('')).toBe(false);
      expect(validateTournamentName('AB')).toBe(false);
      expect(validateTournamentName('A'.repeat(101))).toBe(false);
    });

    it('should handle tournament names with whitespace', () => {
      expect(validateTournamentName(' Tournament ')).toBe(true);
      expect(validateTournamentName('   ')).toBe(false);
    });
  });

  describe('validateTeamName', () => {
    it('should validate correct team names', () => {
      expect(validateTeamName('Lakers')).toBe(true);
      expect(validateTeamName('Golden State Warriors')).toBe(true);
      expect(validateTeamName('A'.repeat(50))).toBe(true);
    });

    it('should reject invalid team names', () => {
      expect(validateTeamName('')).toBe(false);
      expect(validateTeamName('A')).toBe(false);
      expect(validateTeamName('A'.repeat(51))).toBe(false);
    });

    it('should handle team names with whitespace', () => {
      expect(validateTeamName(' Lakers ')).toBe(true);
      expect(validateTeamName('   ')).toBe(false);
    });
  });

  describe('validateScore', () => {
    it('should validate correct scores as numbers', () => {
      expect(validateScore(0)).toBe(true);
      expect(validateScore(50)).toBe(true);
      expect(validateScore(999)).toBe(true);
    });

    it('should validate correct scores as strings', () => {
      expect(validateScore('0')).toBe(true);
      expect(validateScore('50')).toBe(true);
      expect(validateScore('999')).toBe(true);
    });

    it('should reject invalid scores', () => {
      expect(validateScore(-1)).toBe(false);
      expect(validateScore(1000)).toBe(false);
      expect(validateScore('abc')).toBe(false);
      expect(validateScore('')).toBe(false);
      expect(validateScore('-5')).toBe(false);
      expect(validateScore('1000')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateScore(NaN)).toBe(false);
      expect(validateScore(Infinity)).toBe(false);
      expect(validateScore('10.5')).toBe(false); // Should be integer
    });
  });

  describe('validateLoginForm', () => {
    it('should validate correct login form data', () => {
      const result = validateLoginForm('test@example.com', 'password123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid login form data', () => {
      const result = validateLoginForm('invalid-email', '123');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
      expect(result.errors.password).toBe('Password must be at least 6 characters');
    });
  });

  describe('validateRegistrationForm', () => {
    it('should validate correct registration form data', () => {
      const result = validateRegistrationForm('test@example.com', 'password123', 'password123', 'John Doe');
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should return errors for invalid registration form data', () => {
      const result = validateRegistrationForm('invalid-email', '123', '456', 'A');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
      expect(result.errors.password).toBe('Password must be at least 6 characters');
      expect(result.errors.confirmPassword).toBe('Passwords do not match');
      expect(result.errors.displayName).toBe('Display name must be between 2 and 50 characters');
    });
  });

  describe('Type Guards', () => {
    describe('isGameStatus', () => {
      it('should validate correct game statuses', () => {
        expect(isGameStatus(GameStatus.SCHEDULED)).toBe(true);
        expect(isGameStatus(GameStatus.IN_PROGRESS)).toBe(true);
        expect(isGameStatus(GameStatus.COMPLETED)).toBe(true);
        expect(isGameStatus(GameStatus.CANCELLED)).toBe(true);
      });

      it('should reject invalid game statuses', () => {
        expect(isGameStatus('invalid')).toBe(false);
        expect(isGameStatus('')).toBe(false);
        expect(isGameStatus(null)).toBe(false);
        expect(isGameStatus(undefined)).toBe(false);
      });
    });

    describe('isTournamentStatus', () => {
      it('should validate correct tournament statuses', () => {
        expect(isTournamentStatus(TournamentStatus.UPCOMING)).toBe(true);
        expect(isTournamentStatus(TournamentStatus.ACTIVE)).toBe(true);
        expect(isTournamentStatus(TournamentStatus.COMPLETED)).toBe(true);
      });

      it('should reject invalid tournament statuses', () => {
        expect(isTournamentStatus('invalid')).toBe(false);
        expect(isTournamentStatus('')).toBe(false);
        expect(isTournamentStatus(null)).toBe(false);
      });
    });

    describe('isUserRole', () => {
      it('should validate correct user roles', () => {
        expect(isUserRole(UserRole.ADMIN)).toBe(true);
        expect(isUserRole(UserRole.SCOREKEEPER)).toBe(true);
        expect(isUserRole(UserRole.USER)).toBe(true);
      });

      it('should reject invalid user roles', () => {
        expect(isUserRole('invalid')).toBe(false);
        expect(isUserRole('')).toBe(false);
        expect(isUserRole(null)).toBe(false);
      });
    });

    describe('isGender', () => {
      it('should validate correct gender values', () => {
        expect(isGender(Gender.MALE)).toBe(true);
        expect(isGender(Gender.FEMALE)).toBe(true);
        expect(isGender(Gender.MIXED)).toBe(true);
      });

      it('should reject invalid gender values', () => {
        expect(isGender('invalid')).toBe(false);
        expect(isGender('')).toBe(false);
        expect(isGender(null)).toBe(false);
      });
    });
  });
});