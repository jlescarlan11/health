import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, useTheme, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';

import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { YakapStackParamList } from '../../navigation/types';
import { startEnrollment } from '../../store/enrollmentSlice';

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

type EnrollmentPathwayScreenNavigationProp = StackNavigationProp<YakapStackParamList, 'EnrollmentPathway'>;

export const EnrollmentPathwayScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EnrollmentPathwayScreenNavigationProp>();
  const dispatch = useDispatch();
  const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handlePathwaySelect = (pathway: Pathway) => {
    setSelectedPathway(pathway);
    setModalVisible(true);
  };

  const handleProceed = () => {
    if (selectedPathway) {
      dispatch(startEnrollment(selectedPathway.id));
      setModalVisible(false);
      navigation.navigate('EnrollmentGuide');
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right']}>
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
              pathway.recommended && { borderColor: theme.colors.primary, borderWidth: 2 }
            ])}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderTitle}>
                <Text variant="titleMedium" style={styles.cardTitle}>{pathway.name}</Text>
                {pathway.recommended && (
                  <Chip style={[styles.recommendedChip, { backgroundColor: theme.colors.primaryContainer }]} textStyle={[styles.recommendedChipText, { color: theme.colors.primary }]}>Recommended</Chip>
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
              
              <View style={[styles.requirementsSection, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text variant="labelMedium" style={styles.detailLabel}>Requirements:</Text>
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
        contentContainerStyle={StyleSheet.flatten([styles.modalContent, { backgroundColor: theme.colors.surface }])}
      >
        <Text variant="headlineSmall" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Confirm Selection</Text>
        <Text variant="bodyMedium" style={[styles.modalText, { color: theme.colors.onSurfaceVariant }]}>
          You have chosen <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>{selectedPathway?.name}</Text>.
        </Text>
        <Text variant="bodyMedium" style={[styles.modalText, { color: theme.colors.onSurfaceVariant }]}>
          Do you want to proceed with this enrollment pathway?
        </Text>

        <View style={styles.modalButtons}>
          <Button
            variant="outline"
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
    paddingBottom: 24, // Space for bottom tabs/safe area
  },
  headerText: {
    marginBottom: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    overflow: 'hidden', // For border radius
    elevation: 0,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardHeaderTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  recommendedChip: {
    height: 24,
  },
  recommendedChipText: {
    fontSize: 10,
    lineHeight: 10,
    marginVertical: 0,
    marginHorizontal: 4,
  },
  divider: {
    marginVertical: 8,
  },
  cardContent: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    paddingRight: 8,
  },
  detailSection: {
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  detailText: {
    marginBottom: 1,
  },
  requirementsSection: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
  },
  requirementsText: {
    fontStyle: 'italic',
  },
  modalContent: {
    padding: 24,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  modalButton: {
    minWidth: 100,
  },
});