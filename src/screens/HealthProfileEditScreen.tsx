import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, useTheme, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StandardHeader from '../components/common/StandardHeader';
import { useAppSelector, useAppDispatch } from '../hooks/reduxHooks';
import { updateProfile } from '../store/profileSlice';
import { Button } from '../components/common/Button';
import { DigitalIDCard, Text } from '../components';

export const HealthProfileEditScreen = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((state) => state.profile);

  const [fullName, setFullName] = useState(profile.fullName || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [bloodType, setBloodType] = useState(profile.bloodType || '');
  const [philHealthId, setPhilHealthId] = useState(profile.philHealthId || '');
  const [visible, setVisible] = useState(false);

  // Sync local state with Redux state (important for rehydration)
  useEffect(() => {
    setFullName(profile.fullName || '');
    setDob(profile.dob || '');
    setBloodType(profile.bloodType || '');
    setPhilHealthId(profile.philHealthId || '');
  }, [profile]);

  const handleSave = () => {
    dispatch(
      updateProfile({
        fullName: fullName.trim() || null,
        dob: dob.trim() || null,
        bloodType: bloodType.trim() || null,
        philHealthId: philHealthId.trim() || null,
      }),
    );
    setVisible(true);
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
        <DigitalIDCard />
        <View style={styles.header}>
          <View
            style={[styles.avatarContainer, { backgroundColor: theme.colors.primaryContainer }]}
          >
            <MaterialCommunityIcons name="account" size={60} color={theme.colors.primary} />
          </View>
          <Text variant="headlineSmall" style={styles.title}>
            Your Health Profile
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Manage your personal health information for quick access during care and YAKAP
            eligibility.
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
              placeholder="YYYY-MM-DD"
              value={dob}
              onChangeText={setDob}
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

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="shield-check" size={24} color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.infoText}>
            Your health profile data is stored locally on this device. It is only used to assist
            healthcare providers and simplify your enrollment in local health programs.
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <Snackbar
        visible={visible}
        onDismiss={onDismissSnackbar}
        duration={2000}
        style={[styles.snackbar, { backgroundColor: theme.colors.surface }]}
        wrapperStyle={styles.snackbarWrapper}
      >
        <View style={styles.snackbarContent}>
          <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
          <Text style={[styles.snackbarText, { color: theme.colors.onSurface }]}>
            Profile saved successfully
          </Text>
        </View>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontWeight: '700',
    color: '#45474B',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
    paddingHorizontal: 12,
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
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 151, 119, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 151, 119, 0.1)',
  },
  infoText: {
    marginLeft: 12,
    color: '#45474B',
    flex: 1,
    lineHeight: 18,
  },
  snackbarWrapper: {
    bottom: 20, // Standard position
  },
  snackbar: {
    borderRadius: 24,
    elevation: 4,
  },
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snackbarText: {
    marginLeft: 8,
    fontWeight: '600',
  },
});
