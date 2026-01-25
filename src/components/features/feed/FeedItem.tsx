import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ServiceChip } from '../../common/ServiceChip';
import { useAdaptiveUI } from '../../../hooks/useAdaptiveUI';
import { sharingUtils } from '../../../utils/sharingUtils';

export interface FeedItemData {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  timestamp: string;
  imageUrl?: string;
}

interface FeedItemProps {
  item: FeedItemData;
  onPress?: () => void;
}

const TOKIWA_IRO = '#379777';

export const FeedItem: React.FC<FeedItemProps> = ({ item, onPress }) => {
  const theme = useTheme();
  const { scaleFactor } = useAdaptiveUI();

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.shadow,
        },
      ]}
      onPress={onPress}
      mode="contained"
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.category}: ${item.title}. ${item.description}`}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.leftColumn}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name={item.icon as any}
              size={28 * scaleFactor}
              color={TOKIWA_IRO}
            />
          </View>
        </View>

        <View style={styles.rightColumn}>
          <View style={styles.headerRow}>
            <ServiceChip service={item.category} transparent />
            <Text variant="labelSmall" style={styles.timestampText}>
              {item.timestamp}
            </Text>
          </View>

          <Text
            variant="titleMedium"
            numberOfLines={2}
            style={[styles.titleText, { fontSize: 18 * scaleFactor, lineHeight: 24 * scaleFactor }]}
          >
            {item.title}
          </Text>

          <Text
            variant="bodySmall"
            numberOfLines={2}
            style={[
              styles.descriptionText,
              { fontSize: 14 * scaleFactor, lineHeight: 20 * scaleFactor },
            ]}
          >
            {item.description}
          </Text>
        </View>

        <View style={styles.actionContainer}>
          <IconButton
            icon="share-variant-outline"
            size={20 * scaleFactor}
            onPress={(e) => {
              e.stopPropagation();
              sharingUtils.shareHealthTip(item);
            }}
            style={styles.shareIconButton}
            iconColor={theme.colors.primary}
            accessibilityLabel={`Share ${item.title}`}
          />
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.outline} />
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 20,
    elevation: 2,
    borderWidth: 0,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  leftColumn: {
    marginRight: 16,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 24, // Squircle pattern
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightColumn: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timestampText: {
    color: '#888',
    fontWeight: '500',
  },
  titleText: {
    fontWeight: '800',
    marginBottom: 4,
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  descriptionText: {
    color: '#64748B',
    fontWeight: '500',
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  shareIconButton: {
    margin: 0,
    marginBottom: 8,
  },
  chevronContainer: {
    justifyContent: 'center',
    paddingLeft: 8,
  },
});
