/**
 * Loading skeleton component for better perceived performance
 * Shows placeholder content while data is loading
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, DimensionValue } from 'react-native';

interface LoadingSkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[{ width }, style]}>
      <Animated.View
        style={[
          styles.skeleton,
          {
            width: '100%',
            height,
            borderRadius,
            opacity,
          },
        ]}
      />
    </View>
  );
};

// Preset skeleton components for common use cases

export const TournamentCardSkeleton: React.FC = () => (
  <View style={styles.cardSkeleton} accessible={false}>
    <LoadingSkeleton height={24} width="70%" style={styles.titleSkeleton} />
    <LoadingSkeleton height={16} width="50%" style={styles.subtitleSkeleton} />
    <LoadingSkeleton height={16} width="40%" style={styles.dateSkeleton} />
  </View>
);

export const GameCardSkeleton: React.FC = () => (
  <View style={styles.cardSkeleton} accessible={false}>
    <View style={styles.gameRow}>
      <LoadingSkeleton height={20} width="40%" />
      <LoadingSkeleton height={20} width={40} />
      <LoadingSkeleton height={20} width="40%" />
    </View>
    <LoadingSkeleton height={14} width="60%" style={styles.gameInfo} />
    <LoadingSkeleton height={14} width="50%" />
  </View>
);

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View accessible={false} accessibilityLabel="Loading content">
    {Array.from({ length: count }).map((_, index) => (
      <TournamentCardSkeleton key={index} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  cardSkeleton: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titleSkeleton: {
    marginBottom: 8,
  },
  subtitleSkeleton: {
    marginBottom: 8,
  },
  dateSkeleton: {
    marginBottom: 0,
  },
  gameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gameInfo: {
    marginBottom: 4,
  },
});

export default LoadingSkeleton;
