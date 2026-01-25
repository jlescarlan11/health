import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, IconButton, useTheme, Checkbox } from 'react-native-paper';
import { Medication } from '../../../types';

interface MedicationCardProps {
  medication: Medication;
  isTaken: boolean;
  onToggleTaken: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  isTaken,
  onToggleTaken,
  onDelete,
}) => {
  const theme = useTheme();

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content style={styles.content}>
        <View style={styles.leftSection}>
          <Text variant="titleMedium" style={styles.name}>
            {medication.name}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {medication.dosage} • {medication.scheduled_time}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[
              styles.takenButton,
              isTaken && { backgroundColor: theme.colors.primaryContainer },
            ]}
            onPress={() => onToggleTaken(medication.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isTaken }}
            accessibilityLabel={`Mark ${medication.name} as taken`}
          >
            <Checkbox
              status={isTaken ? 'checked' : 'unchecked'}
              onPress={() => onToggleTaken(medication.id)}
              color={theme.colors.primary}
            />
            <Text
              variant="labelSmall"
              style={{
                color: isTaken ? theme.colors.primary : theme.colors.onSurfaceVariant,
                marginLeft: -4,
              }}
            >
              {isTaken ? 'Taken' : 'Mark'}
            </Text>
          </TouchableOpacity>

          <IconButton
            icon="delete-outline"
            iconColor={theme.colors.error}
            size={20}
            onPress={() => onDelete(medication.id)}
            accessibilityLabel={`Delete ${medication.name}`}
          />
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    marginHorizontal: 16,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  leftSection: {
    flex: 1,
    paddingRight: 8,
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  takenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    borderRadius: 16,
  },
});
