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
      <Text variant="labelMedium" style={[styles.detailLabel, color ? { color } : undefined]}>
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
      <StandardHeader title="Choose Pathway" showBackButton />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="bodyLarge" style={styles.headerText}>
          Choose the enrollment method that works best for you.
        </Text>

        {pathways.map((pathway) => (
          <Card
            key={pathway.id}
            onPress={() => handlePathwaySelect(pathway)}
            style={StyleSheet.flatten([
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
              pathway.recommended && { borderColor: theme.colors.primary, borderWidth: 2 },
            ])}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderTitle}>
                <Text variant="titleMedium" style={styles.cardTitle}>
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
                    Recommended
                  </Chip>
                )}
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                {pathway.duration} • {pathway.difficulty}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.cardContent}>
              <View style={styles.row}>
                <View style={styles.column}>
                  {renderDetailItem('Pros', pathway.pros, theme.colors.primary)}
                </View>
                <View style={styles.column}>
                  {renderDetailItem('Cons', pathway.cons, theme.colors.error)}
                </View>
              </View>

              <View
                style={[
                  styles.requirementsSection,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Text variant="labelMedium" style={styles.detailLabel}>
                  Requirements:
                </Text>
                <Text variant="bodySmall" style={styles.requirementsText}>
                  {pathway.requirements.join(', ')}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        contentContainerStyle={StyleSheet.flatten([
          styles.modalContent,
          { backgroundColor: theme.colors.surface },
        ])}
      >
        <Text
          variant="headlineSmall"
          style={[styles.modalTitle, { color: theme.colors.onSurface }]}
        >
          Confirm Selection
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.modalText, { color: theme.colors.onSurfaceVariant }]}
        >
          You have chosen{' '}
          <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>
            {selectedPathway?.name}
          </Text>
          .
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.modalText, { color: theme.colors.onSurfaceVariant }]}
        >
          Do you want to proceed with this enrollment pathway?
        </Text>

        <View style={styles.modalButtons}>
          <Button
            variant="text"
            title="Cancel"
            onPress={() => setModalVisible(false)}
            style={styles.modalButton}
            contentStyle={styles.buttonContent}
          />
          <Button
            variant="primary"
            title="Proceed"
            onPress={handleProceed}
            style={styles.modalButton}
            contentStyle={styles.buttonContent}
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
  headerText: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    padding: 16,
  },
  cardHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: 'bold',
    flex: 1,
  },
  recommendedChip: {
    height: 24,
  },
  recommendedChipText: {
    fontSize: 10,
    lineHeight: 12,
  },
  divider: {
    height: 1,
  },
  cardContent: {
    padding: 16,
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
    fontStyle: 'italic',
  },
  detailSection: {
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailText: {
    lineHeight: 18,
  },
  modalContent: {
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalText: {
    marginBottom: 12,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    minWidth: 100,
  },
  buttonContent: {
    paddingVertical: 10,
  },
});
