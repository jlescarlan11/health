import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTheme, Card, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootStackScreenProps } from '../types/navigation';
import * as DB from '../services/database';
import { ClinicalHistoryRecord } from '../services/database';
import StandardHeader from '../components/common/StandardHeader';
import { Button, Text, ScreenSafeArea } from '../components/common';
import { theme as appTheme } from '../theme';

type Props = RootStackScreenProps<'ClinicalHistory'>;

export const ClinicalHistoryScreen = () => {
  const navigation = useNavigation<Props['navigation']>();
  const theme = useTheme();
  const [history, setHistory] = useState<ClinicalHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const themeSpacing = (theme as typeof appTheme).spacing ?? appTheme.spacing;
  const listBottomPadding = (themeSpacing.lg ?? 16) * 2;

  const loadHistory = async () => {
    try {
      setLoading(true);
      const records = await DB.getClinicalHistory();
      setHistory(records);
    } catch (error) {
      console.error('Failed to load clinical history:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, []),
  );

  const getLevelInfo = (level: string) => {
    const normalized = level.toLowerCase().replace('-', '_');
    switch (normalized) {
      case 'emergency':
        return { icon: 'alert-decagram', color: theme.colors.error };
      case 'hospital':
        return { icon: 'hospital-building', color: theme.colors.secondary };
      case 'health_center':
        return { icon: 'hospital-marker', color: theme.colors.primary };
      case 'self_care':
        return { icon: 'home-heart', color: theme.colors.primary };
      default:
        return { icon: 'clipboard-text-outline', color: theme.colors.outline };
    }
  };

  const renderItem = ({ item }: { item: ClinicalHistoryRecord }) => {
    const levelInfo = getLevelInfo(item.recommended_level);
    const date = new Date(item.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const time = new Date(item.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('ClinicalNote', { recordId: item.id })}
        accessible={true}
        accessibilityLabel={`Assessment from ${date}, ${item.recommended_level.replace('_', ' ')}. Symptoms: ${item.initial_symptoms}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view the full clinical report"
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Avatar.Icon
              size={48}
              icon={levelInfo.icon}
              style={{ backgroundColor: levelInfo.color + '20' }} // 20% opacity
              color={levelInfo.color}
            />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <Text variant="labelSmall" style={styles.dateText}>
                {date} • {time}
              </Text>
            </View>
            <Text variant="titleMedium" numberOfLines={1} style={styles.symptomText}>
              {item.initial_symptoms}
            </Text>
            <Text variant="bodySmall" style={[styles.levelText, { color: levelInfo.color }]}>
              {item.recommended_level.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.outline} />
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScreenSafeArea
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <StandardHeader
        title="My Health Records"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="folder-outline"
                size={80}
                color={theme.colors.outline}
              />
              <Text variant="headlineSmall" style={styles.emptyTitle}>
                Empty Vault
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtitle}>
                You don't have any saved clinical assessments yet.
              </Text>
              <Button
                title="Start New Assessment"
                variant="primary"
                onPress={() => navigation.navigate('Check', { screen: 'CheckSymptom' } as any)}
                style={styles.ctaButton}
              />
            </View>
          }
        />
      )}
    </ScreenSafeArea>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDF2F4',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 0,
    flexGrow: 1,
  },
  card: {
    marginBottom: 12,
    elevation: 1,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    color: '#666',
  },
  symptomText: {
    fontWeight: '700',
    marginBottom: 2,
  },
  levelText: {
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    marginTop: 24,
    fontWeight: '700',
    color: '#45474B',
  },
  emptySubtitle: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  ctaButton: {
    marginTop: 32,
    width: '100%',
    maxWidth: 250,
  },
});
