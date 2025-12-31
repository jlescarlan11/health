import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';

export interface Facility {
  id: string;
  name: string;
  type: string;
  address: string;
  phone?: string;
  services: string[];
  yakapAccredited?: boolean;
}

interface FacilityCardProps {
  facility: Facility;
  onPress?: () => void;
  style?: ViewStyle;
}

export const FacilityCard: React.FC<FacilityCardProps> = ({
  facility,
  onPress,
  style,
}) => {
  const theme = useTheme();

  const accessibilityLabel = `Facility: ${facility.name}, Type: ${facility.type}, Address: ${facility.address}${facility.yakapAccredited ? ', YAKAP Accredited' : ''}`;

  return (
    <Card 
      style={[styles.card, style]} 
      onPress={onPress} 
      mode="elevated"
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view facility details"
    >
      <Card.Title
        title={facility.name}
        subtitle={facility.type}
        titleStyle={styles.title}
        right={(props) =>
          facility.yakapAccredited ? (
            <Chip
              icon="check-decagram"
              style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
              textStyle={{ color: theme.colors.onSecondaryContainer }}
            >
              YAKAP
            </Chip>
          ) : null
        }
      />
      <Card.Content>
        <Text variant="bodyMedium" style={styles.address}>
          {facility.address}
        </Text>
        {facility.phone && (
          <View style={styles.row}>
            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
              {facility.phone}
            </Text>
          </View>
        )}
        <View style={styles.servicesContainer}>
          {facility.services.slice(0, 3).map((service, index) => (
            <Text key={index} variant="labelSmall" style={[styles.service, { color: theme.colors.secondary }]}>
              • {service}
            </Text>
          ))}
          {facility.services.length > 3 && (
            <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>
              +{facility.services.length - 3} more
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 12,
  },
  title: {
    fontWeight: 'bold',
  },
  chip: {
    marginRight: 16,
  },
  address: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  servicesContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  service: {
    marginRight: 8,
  },
});
