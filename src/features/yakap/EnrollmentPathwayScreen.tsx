import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, useTheme, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { RootStackParamList } from '../../types/navigation';

import StandardHeader from '../../components/common/StandardHeader';

type Pathway = {
  id: 'egovph' | 'philhealth_portal' | 'clinic_walkin' | 'philhealth_office';
  name: string;
  duration: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  pros: string[];
  cons: string[];
  requirements: string[];
  recommended?: boolean;
};

const pathways: Pathway[] = [
  {
    id: 'egovph',
    name: 'eGovPH App',
    duration: '10-15 mins',
    difficulty: 'Easy',
    pros: ['Instant processing', 'No travel needed', 'Digital ID card'],
    cons: ['Requires smartphone', 'Needs stable internet'],
    requirements: ['Mobile Device', 'Internet Connection', 'Valid ID'],
    recommended: true,
  },
  {
    id: 'philhealth_portal',
    name: 'PhilHealth Portal',
    duration: '20-30 mins',
    difficulty: 'Medium',
    pros: ['Accessible on any browser', 'No app download'],
    cons: ['Complex interface', 'Photo upload needed'],
    requirements: ['Browser', 'Scanned Docs', 'Email Address'],
  },
  {
    id: 'clinic_walkin',
    name: 'Clinic Visit',
    duration: '1-2 hours',
    difficulty: 'Easy',
    pros: ['Assisted process', 'Direct questions answered'],
    cons: ['Travel required', 'Waiting time'],
    requirements: ['Physical Appearance', 'Valid ID', 'Forms'],
  },
  {
    id: 'philhealth_office',
    name: 'PhilHealth Office',
    duration: '2-4 hours',
    difficulty: 'Hard',
    pros: ['Official processing', 'Immediate distinct card'],
    cons: ['Long queues', 'Travel required', 'Limited hours'],
    requirements: ['Physical Appearance', 'Valid IDs', '2x2 Photos'],
  },
];

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

  const renderDetailItem = (label: string, items: string[], color?: string) => (
    <View style={styles.detailSection}>
      <Text
        variant="labelMedium"
        style={[styles.detailLabel, color ? { color } : { color: theme.colors.onSurfaceVariant }]}
      >
        {label}
      </Text>
      {items.map((item, index) => (
        <Text key={index} variant="bodySmall" style={styles.detailText}>
          • {item}
        </Text>
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

        {pathways.map((pathway) => (
          <Card
            key={pathway.id}
            onPress={() => handlePathwaySelect(pathway)}
            mode="contained"
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderWidth: 1,
                // Subtle drop shadow
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              },
              pathway.recommended && styles.recommendedCard,
            ]}
          >
            {pathway.recommended && (
              <View style={[styles.recommendedAccent, { backgroundColor: theme.colors.primary }]} />
            )}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderTitle}>
                <Text
                  variant="titleMedium"
                  style={[styles.cardTitle, { color: theme.colors.onSurface }]}
                >
                  {pathway.name}
                </Text>
                {pathway.recommended && (
                  <Chip
                    style={[
                      styles.recommendedChip,
                      { backgroundColor: theme.colors.primaryContainer },
                    ]}
                    textStyle={[styles.recommendedChipText, { color: theme.colors.primary }]}
                  >
                    RECOMMENDED
                  </Chip>
                )}
              </View>
              <Text variant="labelMedium" style={{ color: theme.colors.secondary }}>
                {pathway.duration.toUpperCase()} • {pathway.difficulty.toUpperCase()}
              </Text>
            </View>

            <Divider style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

            <View style={styles.cardContent}>
              <View style={styles.row}>
                <View style={styles.column}>
                  {renderDetailItem('PROS', pathway.pros, theme.colors.primary)}
                </View>
                <View style={styles.column}>
                  {renderDetailItem('CONS', pathway.cons, theme.colors.error)}
                </View>
              </View>

              <View
                style={[
                  styles.requirementsSection,
                  { backgroundColor: theme.colors.primaryContainer, opacity: 0.8 },
                ]}
              >
                <Text variant="labelSmall" style={styles.detailLabel}>
                  REQUIREMENTS:
                </Text>
                <Text variant="bodySmall" style={styles.requirementsText}>
                  {pathway.requirements.join(', ')}
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
    padding: 20,
  },
  headerContainer: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  headerText: {
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  recommendedCard: {
    // Distinguish via accent bar and subtle background instead of shadow
    backgroundColor: '#FFFFFF',
  },
  recommendedAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    zIndex: 1,
  },
  cardHeader: {
    padding: 16,
    paddingLeft: 20,
  },
  cardHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  recommendedChip: {
    height: 22,
  },
  recommendedChipText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    opacity: 0.3,
  },
  cardContent: {
    padding: 16,
    paddingLeft: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  column: {
    flex: 1,
  },
  requirementsSection: {
    padding: 12,
    borderRadius: 8,
  },
  requirementsText: {
    marginTop: 4,
    lineHeight: 18,
  },
  detailSection: {
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 1.2,
    fontSize: 10,
  },
  detailText: {
    lineHeight: 20,
    opacity: 0.9,
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
