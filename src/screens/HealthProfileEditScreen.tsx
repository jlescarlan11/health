import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, HelperText, useTheme, Snackbar } from 'react-native-paper';
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
  const [visible, setVisible] = useState(false);
  const [dobError, setDobError] = useState('');
  const [dobTouched, setDobTouched] = useState(false);
  const lastDisplayRef = useRef(formatMmDisplay(initialDobDigits));

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

    dispatch(
      updateProfile({
        fullName: fullName.trim() || null,
        dob: normalized || null,
        bloodType: bloodType.trim() || null,
        philHealthId: philHealthId.trim() || null,
      }),
    );
    setVisible(true);
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

  const onDismissSnackbar = () => setVisible(false);

  const rightActions = (
    <Button
      title="Save"
      variant="text"
      onPress={handleSave}
      labelStyle={[styles.saveButtonLabel, { color: theme.colors.primary }]}
    />
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="Edit Health Profile" showBackButton={true} rightActions={rightActions} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.descriptionContainer}>
          <Text variant="bodyMedium" style={styles.description}>
            Keep your personal information current so care teams can provide faster support when you need it.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              label="Full Name"
              placeholder="e.g. Juan Dela Cruz"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              label="Date of Birth"
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
            />
            <HelperText type="error" visible={!!dobError} style={styles.helperText}>
              {dobError}
            </HelperText>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              label="Blood Type"
              placeholder="e.g. O+"
              value={bloodType}
              onChangeText={setBloodType}
              style={styles.input}
              outlineStyle={[styles.inputOutline, { borderColor: theme.colors.outline }]}
              cursorColor={theme.colors.primary}
              selectionColor={theme.colors.primary + '40'}
              dense
            />
          </View>

          <View style={styles.inputContainer}>
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
            />
          </View>
        </View>
      </KeyboardAwareScrollView>

      <Snackbar
        visible={visible}
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
    paddingBottom: 40, // Standard padding
    flexGrow: 1,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  description: {
    color: '#4A4B4D',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 15,
  },
  inputOutline: {
    borderRadius: 24,
  },
  helperText: {
    marginTop: 4,
    marginLeft: 8,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  snackbarWrapper: {
    bottom: 20, // Standard position
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
