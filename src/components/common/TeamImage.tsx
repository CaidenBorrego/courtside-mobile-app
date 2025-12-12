import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface TeamImageProps {
  teamName: string;
  imageUrl?: string;
  size?: number;
}

const DEFAULT_TEAM_IMAGE = 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=200&h=200&fit=crop';

const TeamImage: React.FC<TeamImageProps> = ({ teamName, imageUrl, size = 60 }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={{ uri: imageUrl || DEFAULT_TEAM_IMAGE }}
        style={[
          styles.image,
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: colors.imagePlaceholder 
          }
        ]}
        resizeMode="cover"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    // Styles applied dynamically
  },
});

export default TeamImage;
