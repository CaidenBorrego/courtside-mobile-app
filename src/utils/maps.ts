import { Platform, Linking, Alert } from 'react-native';
import { Location } from '../types';

/**
 * Opens the device's default maps application with the specified location
 * Handles both iOS and Android platforms
 */
export const openMaps = async (location: Location): Promise<void> => {
  const { coordinates, address, city, state, name } = location;
  let url = '';

  if (coordinates) {
    // Use coordinates if available for more accurate navigation
    const { latitude, longitude } = coordinates;
    if (Platform.OS === 'ios') {
      url = `maps://app?daddr=${latitude},${longitude}`;
    } else {
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
    }
  } else {
    // Fallback to address-based navigation
    const fullAddress = `${address}, ${city}, ${state}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    if (Platform.OS === 'ios') {
      url = `maps://app?daddr=${encodedAddress}`;
    } else {
      url = `geo:0,0?q=${encodedAddress}`;
    }
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      // Fallback to web-based Google Maps
      await openWebMaps(location);
    }
  } catch (error) {
    console.error('Error opening maps:', error);
    Alert.alert('Error', 'Unable to open maps application');
  }
};

/**
 * Opens Google Maps in a web browser as a fallback
 */
export const openWebMaps = async (location: Location): Promise<void> => {
  const { coordinates, address, city, state } = location;
  
  let webUrl = '';
  if (coordinates) {
    webUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
  } else {
    const fullAddress = `${address}, ${city}, ${state}`;
    webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  }

  try {
    const supported = await Linking.canOpenURL(webUrl);
    if (supported) {
      await Linking.openURL(webUrl);
    } else {
      throw new Error('Cannot open web maps');
    }
  } catch (error) {
    console.error('Error opening web maps:', error);
    Alert.alert('Error', 'Unable to open maps');
  }
};

/**
 * Generates a maps URL for the given location
 * Useful for sharing or displaying links
 */
export const generateMapsUrl = (location: Location): string => {
  const { coordinates, address, city, state } = location;
  
  if (coordinates) {
    if (Platform.OS === 'ios') {
      return `maps://app?daddr=${coordinates.latitude},${coordinates.longitude}`;
    } else {
      return `geo:${coordinates.latitude},${coordinates.longitude}?q=${coordinates.latitude},${coordinates.longitude}`;
    }
  } else {
    const fullAddress = `${address}, ${city}, ${state}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    if (Platform.OS === 'ios') {
      return `maps://app?daddr=${encodedAddress}`;
    } else {
      return `geo:0,0?q=${encodedAddress}`;
    }
  }
};

/**
 * Generates a web-based Google Maps URL
 * Platform-independent and always works
 */
export const generateWebMapsUrl = (location: Location): string => {
  const { coordinates, address, city, state } = location;
  
  if (coordinates) {
    return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
  } else {
    const fullAddress = `${address}, ${city}, ${state}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  }
};

/**
 * Formats location address for display
 */
export const formatLocationAddress = (location: Location): string => {
  return `${location.address}, ${location.city}, ${location.state}`;
};

/**
 * Checks if the device can open maps
 */
export const canOpenMaps = async (): Promise<boolean> => {
  const testUrl = Platform.OS === 'ios' ? 'maps://app' : 'geo:0,0';
  try {
    return await Linking.canOpenURL(testUrl);
  } catch (error) {
    console.error('Error checking maps availability:', error);
    return false;
  }
};
