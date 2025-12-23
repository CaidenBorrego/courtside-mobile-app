import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import { Division } from '../../types';
import { useTheme } from '../../hooks/useTheme';

interface DivisionSelectorProps {
  divisions: Division[];
  selectedDivisionId: string | null;
  onSelectDivision: (divisionId: string) => void;
}

const DivisionSelector: React.FC<DivisionSelectorProps> = ({
  divisions,
  selectedDivisionId,
  onSelectDivision,
}) => {
  const { colors } = useTheme();

  if (divisions.length === 0) {
    return null;
  }

  // If only one division, don't show selector
  if (divisions.length === 1) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <View style={styles.labelContainer}>
        <Text variant="labelMedium" style={styles.label}>
          Division:
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {divisions.map((division) => {
          const isSelected = selectedDivisionId === division.id;
          return (
            <Chip
              key={division.id}
              selected={isSelected}
              onPress={() => onSelectDivision(division.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? '#000000' : '#F9FAFB',
                  borderColor: isSelected ? '#000000' : '#E5E7EB',
                },
              ]}
              textStyle={[
                styles.chipText,
                {
                  color: isSelected ? '#FFFFFF' : '#000000',
                },
              ]}
              mode="outlined"
            >
              {division.name}
            </Chip>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    color: '#6B7280',
    fontWeight: '600',
  },
  scrollContent: {
    gap: 8,
  },
  chip: {
    marginRight: 0,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DivisionSelector;
