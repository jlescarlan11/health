import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Checkbox, Text, useTheme } from 'react-native-paper';

export interface ChecklistOption {
  id: string;
  label: string;
}

interface MultiSelectChecklistProps {
  options: ChecklistOption[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  title?: string;
}

/**
 * A reusable multi-select checklist component using React Native Paper components.
 * Designed for easy integration and reuse across the application with a consistent
 * look and feel following the project's design system.
 */
export const MultiSelectChecklist: React.FC<MultiSelectChecklistProps> = ({
  options,
  selectedIds,
  onSelectionChange,
  title,
}) => {
  const theme = useTheme();

  const toggleOption = (id: string) => {
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelected);
  };

  return (
    <View style={styles.container}>
      {!!title && (
        <Text 
          variant="titleSmall" 
          style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
        >
          {title.toUpperCase()}
        </Text>
      )}
      <View style={styles.listContainer}>
        {options.map((option) => (
          <Checkbox.Item
            key={option.id}
            label={option.label}
            status={selectedIds.includes(option.id) ? 'checked' : 'unchecked'}
            onPress={() => toggleOption(option.id)}
            color={theme.colors.primary}
            position="leading"
            labelStyle={styles.label}
            style={styles.item}
            mode="android" // Ensures consistent ripple and layout across platforms
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    marginBottom: 8,
    paddingHorizontal: 16,
    letterSpacing: 1.5,
    fontWeight: '700',
    fontSize: 12,
  },
  listContainer: {
    backgroundColor: 'transparent',
  },
  item: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 16,
    textAlign: 'left',
    marginLeft: 8,
  },
});
