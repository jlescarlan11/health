import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
  Keyboard,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Text, Button, ActivityIndicator, useTheme, Surface } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import {
  addMedication,
  deleteMedication,
  fetchMedications,
  selectAllMedications,
  selectMedicationStatus,
  selectMedicationError,
} from '../store/medicationSlice';
import { AppDispatch } from '../store';
import { Medication } from '../types';
import { MedicationCard } from '../components/features/medication/MedicationCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { InputCard } from '../components/common/InputCard'; // Or use standard TextInput if InputCard is too specific

// Simple Time Input Component since we can't add libraries
const TimeInput = ({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (time: string) => void;
  error?: boolean;
}) => {
  const theme = useTheme();
  
  // Format: HH:MM
  const handleChange = (text: string) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/[^0-9]/g, '');
    
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
    }
    
    // Validate bounds
    if (formatted.length === 5) {
      const hours = parseInt(formatted.split(':')[0], 10);
      const minutes = parseInt(formatted.split(':')[1], 10);
      
      if (hours > 23) formatted = `23:${formatted.split(':')[1]}`;
      if (minutes > 59) formatted = `${formatted.split(':')[0]}:59`;
    }

    onChange(formatted);
  };

  return (
    <View style={styles.timeInputContainer}>
      <Text variant="labelLarge" style={{ marginBottom: 4, color: error ? theme.colors.error : theme.colors.onSurface }}>
        Time (24h)
      </Text>
      <TextInput
        style={[
          styles.timeInput,
          { 
            borderColor: error ? theme.colors.error : theme.colors.outline,
            color: theme.colors.onSurface,
            backgroundColor: theme.colors.surface,
          }
        ]}
        value={value}
        onChangeText={handleChange}
        placeholder="08:00"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        keyboardType="number-pad"
        maxLength={5}
      />
    </View>
  );
};

export default function MedicationTrackerScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const medications = useSelector(selectAllMedications);
  const status = useSelector(selectMedicationStatus);
  const error = useSelector(selectMedicationError);

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('');
  const [takenState, setTakenState] = useState<Record<string, boolean>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchMedications());
    }
  }, [status, dispatch]);

  const handleAddMedication = async () => {
    if (!name.trim() || !dosage.trim() || !time.trim()) {
      setValidationError('Please fill in all fields.');
      return;
    }

    if (time.length !== 5 || !time.includes(':')) {
       setValidationError('Please enter a valid time (HH:MM).');
       return;
    }

    setValidationError(null);
    Keyboard.dismiss();

    const newMedication: Medication = {
      id: Date.now().toString(), // Simple ID generation
      name: name.trim(),
      dosage: dosage.trim(),
      scheduled_time: time,
      is_active: true,
      days_of_week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // Default to every day
    };

    try {
      await dispatch(addMedication(newMedication)).unwrap();
      setName('');
      setDosage('');
      setTime('');
    } catch (err) {
      console.error('Failed to add medication:', err);
      Alert.alert('Error', 'Failed to save medication. Please try again.');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
             // Clear taken state for this item
             setTakenState(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
             });
             dispatch(deleteMedication(id));
          },
        },
      ]
    );
  };

  const handleToggleTaken = (id: string) => {
    setTakenState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderHeader = () => (
    <View style={styles.formContainer}>
      <Text variant="headlineSmall" style={styles.headerTitle}>
        Add Medication
      </Text>
      
      <TextInput
        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, color: theme.colors.onSurface }]}
        placeholder="Medication Name (e.g., Aspirin)"
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={name}
        onChangeText={setName}
      />
      
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
            <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, color: theme.colors.onSurface }]}
            placeholder="Dosage (e.g., 100mg)"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={dosage}
            onChangeText={setDosage}
            />
        </View>
        <View style={{ width: 100 }}>
             <TimeInput value={time} onChange={setTime} error={!!validationError && !time} />
        </View>
      </View>

      {validationError && (
        <Text style={{ color: theme.colors.error, marginBottom: 8 }}>
          {validationError}
        </Text>
      )}

      <Button
        mode="contained"
        onPress={handleAddMedication}
        style={styles.addButton}
        loading={status === 'loading'}
        disabled={status === 'loading'}
      >
        Save Medication
      </Button>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {status === 'loading' ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <>
          <MaterialCommunityIcons
            name="pill"
            size={64}
            color={theme.colors.surfaceVariant}
          />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No medications tracked yet.
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Add one above to get started!
          </Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom', 'left', 'right']}>
      <FlatList
        data={medications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MedicationCard
            medication={item}
            isTaken={!!takenState[item.id]}
            onToggleTaken={handleToggleTaken}
            onDelete={handleDelete}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
      {error && (
        <Surface style={[styles.errorBanner, { backgroundColor: theme.colors.errorContainer }]}>
            <Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text>
            <Button compact onPress={() => dispatch(fetchMedications())}>Retry</Button>
        </Surface>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  formContainer: {
    padding: 16,
    marginBottom: 8,
  },
  headerTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align to top
    marginBottom: 12,
  },
  timeInputContainer: {
    // 
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    height: 52, // Match approximate height of other inputs
  },
  addButton: {
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
});
