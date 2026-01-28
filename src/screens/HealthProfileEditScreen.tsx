import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, HelperText, useTheme, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import StandardHeader from '../components/common/StandardHeader';
import { useAppSelector, useAppDispatch } from '../hooks/reduxHooks';
import { updateProfile } from '../store/profileSlice';
import { Button } from '../components/common/Button';
import { Text } from '../components';
import { ScreenSafeArea } from '../components/common';
import { theme as appTheme } from '../theme';

export const HealthProfileEditScreen = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.profile);
  const insets = useSafeAreaInsets();
  const themeSpacing = (theme as typeof appTheme).spacing ?? appTheme.spacing;
  const baseBottomPadding = themeSpacing.lg ?? 16;
  const scrollBottomPadding = baseBottomPadding * 2;
  const snackbarBottomSpacing = insets.bottom + (themeSpacing.sm ?? 8);

  const initialDobDigits = convertIsoDateToDigits(profile.dob);
  const [fullName, setFullName] = useState(profile.fullName || '');
  const [dobDigits, setDobDigits] = useState(initialDobDigits);
  const [displayDob, setDisplayDob] = useState(formatMmDisplay(initialDobDigits));
  const [normalizedDob, setNormalizedDob] = useState(profile.dob || '');
  const [bloodType, setBloodType] = useState(profile.bloodType || '');
  const [philHealthId, setPhilHealthId] = useState(profile.philHealthId || '');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [dobError, setDobError] = useState('');
  const [dobTouched, setDobTouched] = useState(false);
  const lastDisplayRef = useRef(formatMmDisplay(initialDobDigits));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const statusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chronicConditionsInput, setChronicConditionsInput] = useState(
    joinList(profile.chronicConditions),
  );
  const [allergiesInput, setAllergiesInput] = useState(joinList(profile.allergies));
  const [medicationsInput, setMedicationsInput] = useState(joinList(profile.currentMedications));
  const [surgicalHistoryInput, setSurgicalHistoryInput] = useState(profile.surgicalHistory || '');
  const [familyHistoryInput, setFamilyHistoryInput] = useState(profile.familyHistory || '');

  useEffect(() => {
    setFullName(profile.fullName || '');
    const digitsFromProfile = convertIsoDateToDigits(profile.dob);
    setDobDigits(digitsFromProfile);
    const reformatted = formatMmDisplay(digitsFromProfile);
    setDisplayDob(reformatted);
    lastDisplayRef.current = reformatted;
    setNormalizedDob(profile.dob || '');
    setBloodType(profile.bloodType || '');
    setPhilHealthId(profile.philHealthId || '');
    setDobError('');
    setDobTouched(false);
    setChronicConditionsInput(joinList(profile.chronicConditions));
    setAllergiesInput(joinList(profile.allergies));
    setMedicationsInput(joinList(profile.currentMedications));
    setSurgicalHistoryInput(profile.surgicalHistory || '');
    setFamilyHistoryInput(profile.familyHistory || '');
  }, [profile]);

  useEffect(() => {
    return () => {
      if (statusResetRef.current) {
        clearTimeout(statusResetRef.current);
      }
    };
  }, []);

  const handleSave = () => {
    setDobTouched(true);
    const error = getDobError(dobDigits);
    setDobError(error);
    if (error) {
      return;
    }

    const normalized = dobDigits.length === 8 ? normalizeDigitsToIso(dobDigits) : '';
    if (dobDigits.length && !normalized) {
      setDobError('Enter a valid past date (MM/DD/YYYY).');
      return;
    }

    setSaveState('saving');
    dispatch(
      updateProfile({
        fullName: fullName.trim() || null,
        dob: normalized || null,
        bloodType: bloodType.trim() || null,
        philHealthId: philHealthId.trim() || null,
        chronicConditions: parseList(chronicConditionsInput),
        allergies: parseList(allergiesInput),
        currentMedications: parseList(medicationsInput),
        surgicalHistory: surgicalHistoryInput.trim() || null,
        familyHistory: familyHistoryInput.trim() || null,
      }),
    );
    setSaveState('saved');
    setSnackbarVisible(true);
    if (statusResetRef.current) {
      clearTimeout(statusResetRef.current);
    }
    statusResetRef.current = setTimeout(() => {
      setSaveState('idle');
    }, 2200);
  };

  const handleDobBlur = () => {
    setDobTouched(true);
    const error = getDobError(dobDigits);
    setDobError(error);
    if (!error && dobDigits.length === 8) {
      const normalized = normalizeDigitsToIso(dobDigits);
      setNormalizedDob(normalized || '');
    } else if (error) {
      setNormalizedDob('');
    }
  };

  const handleDobChange = (value: string) => {
    const isDeleting = value.length < lastDisplayRef.current.length;
    const digitsOnly = value.replace(/\D/g, '').slice(0, 8);

    const nextDisplay = isDeleting ? value : formatMmDisplay(digitsOnly);
    setDobDigits(digitsOnly);
    setDisplayDob(nextDisplay);
    lastDisplayRef.current = nextDisplay;

    if (digitsOnly.length === 8) {
      const normalized = normalizeDigitsToIso(digitsOnly);
      setNormalizedDob(normalized || '');
    } else {
      setNormalizedDob('');
    }

    if (dobTouched) {
      setDobError(getDobError(digitsOnly));
    } else if (dobError) {
      setDobError('');
    }
  };

  const onDismissSnackbar = () => setSnackbarVisible(false);
  const isSaving = saveState === 'saving';

  return (
    <ScreenSafeArea
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <StandardHeader title="Edit Health Profile" showBackButton />
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sectionCard}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Personal details
          </Text>
          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="Full name"
              placeholder="e.g. Juan Dela Cruz"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
              accessibilityHint="Use the name that appears on your IDs so clinics can recognize you"
            />
          </View>

          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="Date of birth"
              placeholder="MM/DD/YYYY"
              value={displayDob}
              onChangeText={handleDobChange}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
              error={!!dobError}
              keyboardType="number-pad"
              maxLength={10}
              onBlur={handleDobBlur}
              accessibilityHint="Provide the month, day, and year of your birth to match your profile"
            />
            <HelperText type="error" visible={!!dobError} style={styles.helperText}>
              {dobError}
            </HelperText>
          </View>
        </View>

        <View style={[styles.sectionCard, styles.sectionCardSpacing]}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Health essentials
          </Text>
          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="Blood type"
              placeholder="e.g. O+"
              value={bloodType}
              onChangeText={setBloodType}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
              accessibilityHint="Share your blood type so emergency teams can act quickly"
            />
          </View>

          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="PhilHealth ID"
              placeholder="12-digit number"
              value={philHealthId}
              onChangeText={setPhilHealthId}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              keyboardType="numeric"
              dense
              accessibilityHint="Keep this number accurate for faster claims and eligibility checks"
            />
          </View>
        </View>

        <View style={[styles.sectionCard, styles.sectionCardSpacing]}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Medical context
          </Text>
          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="Chronic conditions"
              placeholder="e.g. asthma, hypertension"
              value={chronicConditionsInput}
              onChangeText={setChronicConditionsInput}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
              multiline
              numberOfLines={2}
              accessibilityHint="Share long-term conditions so the AI tailors follow-up questions"
            />
          </View>

          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="Allergies"
              placeholder="e.g. penicillin, shellfish"
              value={allergiesInput}
              onChangeText={setAllergiesInput}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
              multiline
              numberOfLines={2}
              accessibilityHint="List known allergies so the AI avoids unsafe recommendations"
            />
          </View>

          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="Current medications"
              placeholder="e.g. metformin, lisinopril"
              value={medicationsInput}
              onChangeText={setMedicationsInput}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
              multiline
              numberOfLines={2}
              accessibilityHint="Tell the AI what you take so it can avoid interactions and redundant suggestions"
            />
          </View>

          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="Surgical history"
              placeholder="Add relevant surgeries, dates, and notes"
              value={surgicalHistoryInput}
              onChangeText={setSurgicalHistoryInput}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
              multiline
              numberOfLines={3}
              accessibilityHint="Capture past surgeries so the AI can factor healing history into its advice"
            />
          </View>

          <View style={styles.field}>
            <TextInput
              mode="outlined"
              label="Family history"
              placeholder="e.g. diabetes, heart disease"
              value={familyHistoryInput}
              onChangeText={setFamilyHistoryInput}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
              multiline
              numberOfLines={3}
              accessibilityHint="Let the AI know your family patterns so it can watch for similar risks"
            />
          </View>
        </View>

        <View style={styles.buttonArea}>
          <Button
            title="Save changes"
            variant="primary"
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving}
            accessibilityHint="Save your updated health record details"
            style={styles.saveButton}
          />
          {saveState === 'saving' && (
            <Text variant="bodySmall" style={styles.statusMessage}>
              Saving updates... hang tight.
            </Text>
          )}
          {saveState === 'saved' && (
            <Text variant="bodySmall" style={[styles.statusMessage, styles.statusSuccess]}>
              Saved - the care team now sees your latest info.
            </Text>
          )}
        </View>
      </KeyboardAwareScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={onDismissSnackbar}
        duration={2000}
        style={[styles.snackbar, { backgroundColor: theme.colors.surface }]}
        wrapperStyle={[styles.snackbarWrapper, { bottom: snackbarBottomSpacing }]}
      >
        <Text style={[styles.snackbarText, { color: theme.colors.onSurface }]}>
          Profile saved successfully
        </Text>
      </Snackbar>
    </ScreenSafeArea>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  sectionCardSpacing: {
    marginTop: 20,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  field: {
    marginTop: 18,
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 15,
  },
  inputOutline: {
    borderRadius: 18,
  },
  helperText: {
    marginTop: 4,
    marginLeft: 8,
  },
  buttonArea: {
    marginTop: 30,
  },
  saveButton: {
    borderRadius: 16,
  },
  statusMessage: {
    marginTop: 8,
    color: '#5C5F66',
  },
  statusSuccess: {
    color: '#1E7E34',
  },
  snackbarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  snackbar: {
    borderRadius: 24,
    elevation: 4,
  },
  snackbarText: {
    fontWeight: '600',
  },
});

function formatMmDisplay(digits: string): string {
  const month = digits.slice(0, 2);
  const day = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let formatted = '';

  if (month) {
    formatted += month;
    if (digits.length > 2) {
      formatted += '/';
    }
  }

  if (day) {
    formatted += day;
    if (digits.length > 4) {
      formatted += '/';
    }
  }

  if (year) {
    formatted += year;
  }

  return formatted;
}

function normalizeDigitsToIso(digits: string): string | null {
  if (digits.length !== 8) {
    return null;
  }

  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  const candidate = new Date(year, month - 1, day);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() + 1 !== month ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  if (candidate > new Date()) {
    return null;
  }

  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');

  return `${year}-${paddedMonth}-${paddedDay}`;
}

function convertIsoDateToDigits(isoDate?: string | null): string {
  if (!isoDate) {
    return '';
  }

  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return '';
  }

  return `${match[2]}${match[3]}${match[1]}`;
}

function getDobError(digits: string): string {
  if (!digits) {
    return '';
  }

  if (digits.length !== 8) {
    return 'Complete the date as MM/DD/YYYY.';
  }

  if (!normalizeDigitsToIso(digits)) {
    return 'Enter a valid past date (MM/DD/YYYY).';
  }

  return '';
}

function joinList(list?: string[] | null): string {
  if (!list || list.length === 0) {
    return '';
  }

  return list.filter(Boolean).join(', ');
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
