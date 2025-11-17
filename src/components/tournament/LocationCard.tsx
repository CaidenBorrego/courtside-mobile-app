import React from 'react';
import { View, StyleSheet, Linking, Platform, Alert } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { Location } from '../../types';

interface LocationCardProps {
  location: Location;
}

const LocationCard: React.FC<LocationCardProps> = ({ location }) => {
  const openInMaps = async () => {
    try {
      let url: string;

      if (location.coordinates) {
        // Use coordinates if available
        const { latitude, longitude } = location.coordinates;
        
        if (Platform.OS === 'ios') {
          url = `maps://app?daddr=${latitude},${longitude}`;
        } else {
          url = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
        }
      } else if (location.mapUrl) {
        // Use custom map URL if provided
        url = location.mapUrl;
      } else {
        // Fallback to address-based search
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
        // Fallback to Google Maps web
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
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>
            {location.name}
          </Text>
        </View>

        <View style={styles.addressContainer}>
          <Text variant="bodyMedium" style={styles.address}>
            {location.address}
          </Text>
          <Text variant="bodyMedium" style={styles.cityState}>
            {location.city}, {location.state}
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={openInMaps}
          style={styles.button}
          icon="map-marker"
        >
          Open in Maps
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
  },
  addressContainer: {
    marginBottom: 8,
  },
  address: {
    color: '#424242',
    marginBottom: 4,
  },
  cityState: {
    color: '#424242',
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
});

export default LocationCard;
