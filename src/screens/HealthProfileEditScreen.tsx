import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, HelperText, useTheme, Snackbar, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import StandardHeader from '../components/common/StandardHeader';
import { useAppSelector, useAppDispatch } from '../hooks/reduxHooks';
import { updateProfile } from '../store/profileSlice';
import { Button } from '../components/common/Button';
import { Text } from '../components';

export const HealthProfileEditScreen = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.profile);

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
  const heroNameLabel = fullName.trim() || 'Add your full name';
  const heroBloodLabel = bloodType.trim() || 'Add your blood type';
  const isSaving = saveState === 'saving';
  const headerActionLabel =
    isSaving ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save';
  const headerRightActions = (
    <Button
      title={headerActionLabel}
      variant="text"
      onPress={handleSave}
      loading={isSaving}
      disabled={isSaving}
      labelStyle={[styles.saveButtonLabel, { color: theme.colors.primary }]}
      accessibilityLabel="Save health profile"
    />
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="My Health Records" showBackButton rightActions={headerRightActions} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <Text variant="headlineSmall" style={styles.heroTitle}>
            My Health Record
          </Text>
          <Text variant="bodyMedium" style={styles.heroSubtitle}>
            Keep this section current so care teams immediately understand what matters most.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text variant="titleLarge" style={styles.heroValue}>
                {heroNameLabel}
              </Text>
              <Text variant="bodySmall" style={styles.heroHint}>
                Primary name on file
              </Text>
            </View>
            <View style={styles.heroStat}>
              <Text variant="titleLarge" style={styles.heroValue}>
                {heroBloodLabel}
              </Text>
              <Text variant="bodySmall" style={styles.heroHint}>
                Blood type for emergencies
              </Text>
            </View>
          </View>
          <View style={styles.heroBadges}>
            <Surface
              style={[styles.heroBadge, { backgroundColor: theme.colors.primaryContainer }]}
              elevation={1}
            >
              <Text variant="bodySmall" style={styles.heroBadgeLabel}>
                Date of birth
              </Text>
              <Text variant="titleSmall" style={styles.heroBadgeValue}>
                {displayDob || 'MM/DD/YYYY'}
              </Text>
            </Surface>
            <Surface
              style={[styles.heroBadge, styles.heroBadgeSpacing, { backgroundColor: theme.colors.secondaryContainer }]}
              elevation={1}
            >
              <Text variant="bodySmall" style={styles.heroBadgeLabel}>
                PhilHealth ID
              </Text>
              <Text variant="titleSmall" style={styles.heroBadgeValue}>
                {philHealthId || 'Optional'}
              </Text>
            </Surface>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Personal details
          </Text>
          <Text variant="bodySmall" style={styles.sectionHint}>
            Clinics use this information to confirm your identity and keep alignment with their records.
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
            <HelperText type="info" visible style={styles.helperText}>
              Match the name that clinics and diagnostics already have on record.
            </HelperText>
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
            {!dobError && (
              <HelperText type="info" visible style={styles.helperText}>
                We use this date to align you with your clinics and maintain safe care plans.
              </HelperText>
            )}
          </View>
        </View>

        <View style={[styles.sectionCard, styles.sectionCardSpacing]}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Health essentials
          </Text>
          <Text variant="bodySmall" style={styles.sectionHint}>
            These values help providers prepare the right care for you and avoid repeated questions.
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
            <HelperText type="info" visible style={styles.helperText}>
              Adding your blood type keeps teams ready for urgent care without guessing.
            </HelperText>
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
            <HelperText type="info" visible style={styles.helperText}>
              Keeping your ID synced avoids delays when updating benefits or billing.
            </HelperText>
          </View>
        </View>

        <View style={styles.buttonArea}>
          <Button
            title="Save changes"
            variant="primary"
            onPress={handleSave}
            loading={saveState === 'saving'}
            disabled={saveState === 'saving'}
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
        wrapperStyle={styles.snackbarWrapper}
      >
        <Text style={[styles.snackbarText, { color: theme.colors.onSurface }]}>
          Profile saved successfully
        </Text>
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  heroTitle: {
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 6,
    color: '#4A4B4D',
    lineHeight: 20,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    paddingRight: 12,
  },
  heroValue: {
    fontWeight: '700',
    color: '#1B1B1F',
  },
  heroHint: {
    marginTop: 4,
    color: '#5C5F66',
  },
  heroBadges: {
    flexDirection: 'row',
    marginTop: 18,
  },
  heroBadge: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
  },
  heroBadgeSpacing: {
    marginLeft: 12,
  },
  heroBadgeLabel: {
    color: '#5C5F66',
  },
  heroBadgeValue: {
    marginTop: 4,
    fontWeight: '600',
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
  sectionHint: {
    marginTop: 4,
    color: '#5C5F66',
    lineHeight: 20,
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
    bottom: 20,
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
