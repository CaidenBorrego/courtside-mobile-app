import React from 'react';
import { View, StyleSheet, Linking, Platform, Alert, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Location } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface LocationCardProps {
  location: Location;
}

const LocationCard: React.FC<LocationCardProps> = ({ location }) => {
  const { colors } = useTheme();

  const openInMaps = async () => {
    try {
      let url: string;

      if (location.coordinates) {
        const { latitude, longitude } = location.coordinates;
        
        if (Platform.OS === 'ios') {
          url = `maps://app?daddr=${latitude},${longitude}`;
        } else {
          url = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
        }
      } else if (location.mapUrl) {
        url = location.mapUrl;
      } else {
        const address = `${location.address}, ${location.city}, ${location.state}`;
        const encodedAddress = encodeURIComponent(address);
        
        if (Platform.OS === 'ios') {
          url = `maps://app?q=${encodedAddress}`;
        } else {
          url = `geo:0,0?q=${encodedAddress}`;
        }
      }

      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        const address = `${location.address}, ${location.city}, ${location.state}`;
        const encodedAddress = encodeURIComponent(address);
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
      Alert.alert(
        'Error',
        'Unable to open maps. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {location.name}
        </Text>

        <View style={styles.addressContainer}>
          <Text style={[styles.address, { color: colors.textSecondary }]}>
            {location.address}
          </Text>
          <Text style={[styles.cityState, { color: colors.textSecondary }]}>
            {location.city}, {location.state}
          </Text>
        </View>

        <TouchableOpacity
          onPress={openInMaps}
          style={[styles.button, { backgroundColor: colors.text }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            Open in Maps
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  addressContainer: {
    marginBottom: 16,
  },
  address: {
    fontSize: 14,
    marginBottom: 4,
  },
  cityState: {
    fontSize: 14,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LocationCard;
