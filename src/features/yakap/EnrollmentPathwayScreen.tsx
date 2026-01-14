import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { RootStackParamList } from '../../types/navigation';
import { ENROLLMENT_PATHWAYS, EnrollmentPathway as Pathway } from './yakapContent';

import StandardHeader from '../../components/common/StandardHeader';

type EnrollmentPathwayScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EnrollmentPathway'
>;

export const EnrollmentPathwayScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EnrollmentPathwayScreenNavigationProp>();
  const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handlePathwaySelect = (pathway: Pathway) => {
    setSelectedPathway(pathway);
    setModalVisible(true);
  };

  const handleProceed = () => {
    if (selectedPathway) {
      setModalVisible(false);
      navigation.navigate('EnrollmentGuide', { pathwayId: selectedPathway.id });
    }
  };

  const renderDetailItem = (
    label: string,
    items: string[],
    color: string,
    icon: keyof typeof MaterialCommunityIcons.glyphMap
  ) => (
    <View style={styles.detailSection}>
      <Text variant="labelMedium" style={[styles.detailLabel, { color }]}>
        {label}
      </Text>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <MaterialCommunityIcons name={icon} size={14} color={color} style={styles.itemIcon} />
          <Text variant="bodySmall" style={[styles.detailText, { color: theme.colors.onSurface }]}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="Enrollment Path" showBackButton />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerContainer}>
          <Text variant="bodyLarge" style={[styles.headerText, { color: theme.colors.onSurface }]}>
            Choose the enrollment method that works best for you.
          </Text>
        </View>

        {ENROLLMENT_PATHWAYS.map((pathway) => (
          <Card
            key={pathway.id}
            onPress={() => handlePathwaySelect(pathway)}
            mode="contained"
            accessibilityLabel={`${pathway.name} pathway`}
            accessibilityHint={`Double tap to select the ${pathway.name} enrollment method`}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: pathway.recommended
                  ? theme.colors.primary
                  : theme.colors.outlineVariant,
                borderWidth: pathway.recommended ? 1.5 : 1,
                // Soft shadow for depth (Japanese 'Yugen')
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderTitle}>
                <View style={styles.titleWithChip}>
                  <Text
                    variant="titleLarge"
                    style={[styles.cardTitle, { color: theme.colors.onSurface }]}
                  >
                    {pathway.name}
                  </Text>
                  {pathway.recommended && (
                    <Chip
                      mode="flat"
                      style={[styles.recommendedChip, { backgroundColor: theme.colors.primary }]}
                      textStyle={[styles.recommendedChipText, { color: theme.colors.onPrimary }]}
                    >
                      BEST CHOICE
                    </Chip>
                  )}
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                  style={styles.headerChevron}
                />
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="labelMedium"
                    style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {pathway.estimatedDuration.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.dot, { backgroundColor: theme.colors.outlineVariant }]} />
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="speedometer"
                    size={14}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="labelMedium"
                    style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {pathway.difficulty.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Subtle Divider (Ma) */}
            <View style={[styles.subtleDivider, { backgroundColor: theme.colors.outlineVariant }]} />

            <View style={styles.cardContent}>
              <View style={styles.row}>
                <View style={styles.column}>
                  {renderDetailItem('PROS', pathway.pros, theme.colors.primary, 'check-circle-outline')}
                </View>
                <View style={styles.column}>
                  {renderDetailItem('CONS', pathway.cons, theme.colors.onSurfaceVariant, 'minus-circle-outline')}
                </View>
              </View>

              <View
                style={[
                  styles.requirementsSection,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.outlineVariant, borderWidth: 1 },
                ]}
              >
                <Text
                  variant="labelSmall"
                  style={[styles.requirementsLabel, { color: theme.colors.onSurfaceVariant }]}
                >
                  WHAT YOU'LL NEED:
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.requirementsText, { color: theme.colors.onSurface }]}
                >
                  {pathway.requirements.join(' • ')}
                </Text>
              </View>
            </View>
          </Card>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
      >
        <Text
          variant="headlineSmall"
          style={[styles.modalTitle, { color: theme.colors.onSurface }]}
        >
          Confirm Pathway
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.modalText, { color: theme.colors.onSurfaceVariant }]}
        >
          You have chosen{' '}
          <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            {selectedPathway?.name}
          </Text>
          . Do you want to proceed with this enrollment guide?
        </Text>

        <View style={styles.modalButtons}>
          <Button
            variant="text"
            title="Cancel"
            onPress={() => setModalVisible(false)}
            style={styles.modalButton}
          />
          <Button
            variant="primary"
            title="Proceed"
            onPress={handleProceed}
            style={styles.modalButton}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerContainer: {
    marginBottom: 32,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  headerText: {
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.3,
    opacity: 0.8,
  },
  card: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  cardHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWithChip: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerChevron: {
    marginLeft: 8,
  },
  cardTitle: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  recommendedChip: {
    borderRadius: 6,
    marginLeft: 12,
    height: 26,
    justifyContent: 'center',
  },
  recommendedChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginHorizontal: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 6,
    fontWeight: '600',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 12,
    opacity: 0.5,
  },
  subtleDivider: {
    height: 1,
    marginHorizontal: 16,
    opacity: 0.1,
  },
  cardContent: {
    padding: 16,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  column: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  requirementsSection: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  requirementsLabel: {
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 1.5,
    fontSize: 10,
  },
  requirementsText: {
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  detailSection: {
    marginRight: 12,
  },
  detailLabel: {
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1.5,
    fontSize: 11,
  },
  detailText: {
    lineHeight: 20,
    flex: 1,
    fontWeight: '400',
  },
  modalContent: {
    padding: 24,
    margin: 24,
    borderRadius: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalText: {
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    minWidth: 100,
  },
});