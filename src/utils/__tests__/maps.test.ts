import { Platform, Linking, Alert } from 'react-native';
import {
  openMaps,
  openWebMaps,
  generateMapsUrl,
  generateWebMapsUrl,
  formatLocationAddress,
  canOpenMaps,
} from '../maps';
import { Location } from '../../types';
import { Timestamp } from 'firebase/firestore';

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

const mockLocationWithCoordinates: Location = {
  id: 'location123',
  name: 'Main Arena',
  address: '123 Sports Ave',
  city: 'Los Angeles',
  state: 'CA',
  coordinates: {
    latitude: 34.0522,
    longitude: -118.2437,
  },
  createdAt: Timestamp.now(),
};

const mockLocationWithoutCoordinates: Location = {
  id: 'location456',
  name: 'Secondary Court',
  address: '456 Basketball Blvd',
  city: 'San Francisco',
  state: 'CA',
  createdAt: Timestamp.now(),
};

describe('Maps Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  describe('openMaps', () => {
    it('should open iOS maps with coordinates', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openMaps(mockLocationWithCoordinates);

      expect(Linking.canOpenURL).toHaveBeenCalledWith('maps://app?daddr=34.0522,-118.2437');
      expect(Linking.openURL).toHaveBeenCalledWith('maps://app?daddr=34.0522,-118.2437');
    });

    it('should open Android maps with coordinates', async () => {
      Platform.OS = 'android';
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openMaps(mockLocationWithCoordinates);

      expect(Linking.canOpenURL).toHaveBeenCalledWith('geo:34.0522,-118.2437?q=34.0522,-118.2437');
      expect(Linking.openURL).toHaveBeenCalledWith('geo:34.0522,-118.2437?q=34.0522,-118.2437');
    });

    it('should open iOS maps with address when coordinates are not available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openMaps(mockLocationWithoutCoordinates);

      const expectedUrl = 'maps://app?daddr=456%20Basketball%20Blvd%2C%20San%20Francisco%2C%20CA';
      expect(Linking.canOpenURL).toHaveBeenCalledWith(expectedUrl);
      expect(Linking.openURL).toHaveBeenCalledWith(expectedUrl);
    });

    it('should open Android maps with address when coordinates are not available', async () => {
      Platform.OS = 'android';
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openMaps(mockLocationWithoutCoordinates);

      const expectedUrl = 'geo:0,0?q=456%20Basketball%20Blvd%2C%20San%20Francisco%2C%20CA';
      expect(Linking.canOpenURL).toHaveBeenCalledWith(expectedUrl);
      expect(Linking.openURL).toHaveBeenCalledWith(expectedUrl);
    });

    it('should fallback to web maps when native maps are not supported', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openMaps(mockLocationWithCoordinates);

      const webUrl = 'https://www.google.com/maps/search/?api=1&query=34.0522,-118.2437';
      expect(Linking.openURL).toHaveBeenCalledWith(webUrl);
    });

    it('should show alert when unable to open maps', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('Cannot open URL'));

      await openMaps(mockLocationWithCoordinates);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Unable to open maps application');
    });
  });

  describe('openWebMaps', () => {
    it('should open Google Maps with coordinates', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openWebMaps(mockLocationWithCoordinates);

      const expectedUrl = 'https://www.google.com/maps/search/?api=1&query=34.0522,-118.2437';
      expect(Linking.openURL).toHaveBeenCalledWith(expectedUrl);
    });

    it('should open Google Maps with address when coordinates are not available', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      await openWebMaps(mockLocationWithoutCoordinates);

      const expectedUrl = 'https://www.google.com/maps/search/?api=1&query=456%20Basketball%20Blvd%2C%20San%20Francisco%2C%20CA';
      expect(Linking.openURL).toHaveBeenCalledWith(expectedUrl);
    });

    it('should show alert when unable to open web maps', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

      await openWebMaps(mockLocationWithCoordinates);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Unable to open maps');
    });
  });

  describe('generateMapsUrl', () => {
    it('should generate iOS maps URL with coordinates', () => {
      const url = generateMapsUrl(mockLocationWithCoordinates);
      expect(url).toBe('maps://app?daddr=34.0522,-118.2437');
    });

    it('should generate Android maps URL with coordinates', () => {
      Platform.OS = 'android';
      const url = generateMapsUrl(mockLocationWithCoordinates);
      expect(url).toBe('geo:34.0522,-118.2437?q=34.0522,-118.2437');
    });

    it('should generate iOS maps URL with address', () => {
      const url = generateMapsUrl(mockLocationWithoutCoordinates);
      expect(url).toBe('maps://app?daddr=456%20Basketball%20Blvd%2C%20San%20Francisco%2C%20CA');
    });

    it('should generate Android maps URL with address', () => {
      Platform.OS = 'android';
      const url = generateMapsUrl(mockLocationWithoutCoordinates);
      expect(url).toBe('geo:0,0?q=456%20Basketball%20Blvd%2C%20San%20Francisco%2C%20CA');
    });
  });

  describe('generateWebMapsUrl', () => {
    it('should generate web maps URL with coordinates', () => {
      const url = generateWebMapsUrl(mockLocationWithCoordinates);
      expect(url).toBe('https://www.google.com/maps/search/?api=1&query=34.0522,-118.2437');
    });

    it('should generate web maps URL with address', () => {
      const url = generateWebMapsUrl(mockLocationWithoutCoordinates);
      expect(url).toBe('https://www.google.com/maps/search/?api=1&query=456%20Basketball%20Blvd%2C%20San%20Francisco%2C%20CA');
    });
  });

  describe('formatLocationAddress', () => {
    it('should format location address correctly', () => {
      const address = formatLocationAddress(mockLocationWithCoordinates);
      expect(address).toBe('123 Sports Ave, Los Angeles, CA');
    });

    it('should format location address without coordinates', () => {
      const address = formatLocationAddress(mockLocationWithoutCoordinates);
      expect(address).toBe('456 Basketball Blvd, San Francisco, CA');
    });
  });

  describe('canOpenMaps', () => {
    it('should return true when maps can be opened on iOS', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

      const result = await canOpenMaps();

      expect(result).toBe(true);
      expect(Linking.canOpenURL).toHaveBeenCalledWith('maps://app');
    });

    it('should return true when maps can be opened on Android', async () => {
      Platform.OS = 'android';
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

      const result = await canOpenMaps();

      expect(result).toBe(true);
      expect(Linking.canOpenURL).toHaveBeenCalledWith('geo:0,0');
    });

    it('should return false when maps cannot be opened', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

      const result = await canOpenMaps();

      expect(result).toBe(false);
    });

    it('should return false when checking maps availability fails', async () => {
      (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error('Error'));

      const result = await canOpenMaps();

      expect(result).toBe(false);
    });
  });
});
