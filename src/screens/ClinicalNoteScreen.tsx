import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { DoctorHandoverCard } from '../components/features/navigation/DoctorHandoverCard';
import { RootStackParamList, RootStackScreenProps } from '../types/navigation';
import StandardHeader from '../components/common/StandardHeader';

type ClinicalNoteRouteProp = RouteProp<RootStackParamList, 'ClinicalNote'>;

export const ClinicalNoteScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ClinicalNoteRouteProp>();
  const theme = useTheme();
  const latestAssessment = useSelector((state: RootState) => state.offline.latestAssessment);

  const note = latestAssessment;

  if (!note) {
    return (
      <View style={styles.centerContainer}>
        <Text>Clinical note not found.</Text>
        <IconButton icon="home" onPress={() => navigation.navigate('Home' as never)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StandardHeader 
        title="Clinical Handover" 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />
      <DoctorHandoverCard 
        clinicalSoap={note.clinical_soap} 
        timestamp={note.timestamp} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
