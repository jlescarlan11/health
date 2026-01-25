import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, useTheme, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainTabScreenProps } from '../types/navigation';
import StandardHeader from '../components/common/StandardHeader';
import { FeedItem, FeedItemData } from '../components/features/feed/FeedItem';

const MOCK_DATA: FeedItemData[] = [
  {
    id: '1',
    title: 'Naga City Health Tips',
    category: 'Prevention',
    description: 'Protect yourself from seasonal illnesses with these local health guidelines.',
    icon: 'shield-check-outline',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    title: 'Upcoming Vaccination Drive',
    category: 'Community',
    description: "Free vaccinations available at the Naga City People's Hall this Friday.",
    icon: 'needle',
    timestamp: '5 hours ago',
  },
  {
    id: '3',
    title: 'Mental Health Awareness',
    category: 'Wellness',
    description: 'Join our weekly session on stress management and local support resources.',
    icon: 'brain',
    timestamp: '1 day ago',
  },
];

type Props = MainTabScreenProps<'HealthFeed'>;

export const HealthFeedScreen = () => {
  const navigation = useNavigation<Props['navigation']>();
  const theme = useTheme();

  const renderItem = ({ item }: { item: FeedItemData }) => {
    return (
      <FeedItem
        item={item}
        onPress={() => {
          // Placeholder for detail navigation
          console.log('Pressed item:', item.title);
        }}
      />
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="Health Promotion Feed" showBackButton={false} />
      <FlatList
        data={MOCK_DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerInfo}>
            <Text variant="titleLarge" style={styles.headerTitle}>
              Latest Updates
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Stay informed with the latest health news and tips for Naga City.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="newspaper-variant-outline"
              size={80}
              color={theme.colors.outline}
            />
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              No Updates Yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Check back later for the latest health promotions and news.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for tab bar
    flexGrow: 1,
  },
  headerInfo: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontWeight: '800',
    color: '#45474B',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
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
});
