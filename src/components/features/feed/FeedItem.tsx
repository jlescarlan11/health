import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Card, Text, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ServiceChip } from '../../common/ServiceChip';
import { useAdaptiveUI } from '../../../hooks/useAdaptiveUI';
import { sharingUtils } from '../../../utils/sharingUtils';
import { FeedItem as FeedItemType } from '../../../types/feed';

export interface FeedItemData {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  timestamp: string;
  imageUrl?: string;
  url?: string;
}

interface FeedItemProps {
  item: FeedItemData | FeedItemType;
  onPress?: () => void;
}

const TOKIWA_IRO = '#379777';

export const FeedItem: React.FC<FeedItemProps> = ({ item, onPress }) => {
  const theme = useTheme();
  const { scaleFactor } = useAdaptiveUI();

  // Unified data mapping
  const title = item.title;
  const description = 'description' in item ? item.description : item.excerpt;
  const category = 'category' in item ? item.category : (item.categories[0] || 'Health');
  const icon = (item as any).icon || 'newspaper-variant-outline';
  const imageUrl = item.imageUrl;
  
  let timestamp = '';
  if ('timestamp' in item) {
    timestamp = item.timestamp;
  } else if (item.dateISO) {
    try {
      timestamp = formatDistanceToNow(parseISO(item.dateISO), { addSuffix: true });
    } catch (e) {
      timestamp = item.dateISO.split('T')[0];
    }
  }

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
      accessibilityLabel={`${category}: ${title}. ${description}`}
    >
      {imageUrl && (
        <Card.Cover source={{ uri: imageUrl }} style={styles.cardImage} />
      )}
      <Card.Content style={styles.cardContent}>
        <View style={styles.leftColumn}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name={icon as any}
              size={28 * scaleFactor}
              color={TOKIWA_IRO}
            />
          </View>
        </View>

        <View style={styles.rightColumn}>
          <View style={styles.headerRow}>
            <ServiceChip service={category} transparent />
            <Text variant="labelSmall" style={styles.timestampText}>
              {timestamp}
            </Text>
          </View>

          <Text
            variant="titleMedium"
            numberOfLines={2}
            style={[styles.titleText, { fontSize: 18 * scaleFactor, lineHeight: 24 * scaleFactor }]}
          >
            {title}
          </Text>

          <Text
            variant="bodySmall"
            numberOfLines={2}
            style={[
              styles.descriptionText,
              { fontSize: 14 * scaleFactor, lineHeight: 20 * scaleFactor },
            ]}
          >
            {description}
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
            accessibilityLabel={`Share ${title}`}
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
  cardImage: {
    height: 160,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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