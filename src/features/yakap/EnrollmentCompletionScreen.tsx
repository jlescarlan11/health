import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, BackHandler } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/navigation';
import StandardHeader from '../../components/common/StandardHeader';
import { Button, ScreenSafeArea } from '../../components/common';
import { YakapBenefitsCard } from '../../components/features/yakap';
import { theme as appTheme } from '../../theme';

type EnrollmentCompletionNavigationProp = StackNavigationProp<
  RootStackParamList,
  'EnrollmentCompletion'
>;

const EnrollmentCompletionScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EnrollmentCompletionNavigationProp>();
  const themeSpacing = (theme as typeof appTheme).spacing ?? appTheme.spacing;
  const scrollContentPaddingBottom = (themeSpacing.lg ?? 16) * 2;

  const navigateToFacilities = () => {
    // Navigate to Find tab with YAKAP filter
    navigation.navigate('Find', {
      screen: 'FacilityDirectory',
      params: { filter: 'yakap' },
    });
  };

  const handleExitFlow = useCallback(() => {
    Alert.alert(
      'Return to YAKAP',
      'Are you sure you want to exit the guide summary and return to the YAKAP overview?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return',
          onPress: () =>
            navigation.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [{ name: 'Home' }, { name: 'YAKAP' }],
              }),
            ),
          style: 'default',
        },
      ],
    );
    return true; // Prevent default behavior
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        return handleExitFlow();
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [handleExitFlow]),
  );

  return (
    <ScreenSafeArea
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right', 'bottom']}
    >
      <StandardHeader title="Guide Complete" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollContentPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.celebrationContainer}>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Enrollment Guide Complete
          </Text>
          <Text
            variant="bodyLarge"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            You now have all the information needed to finalize your enrollment. Visit an accredited
            health center to start receiving your benefits.
          </Text>
        </View>

        <YakapBenefitsCard style={{ marginBottom: 40 }} />

        <View style={styles.actionContainer}>
          <Button
            variant="primary"
            onPress={navigateToFacilities}
            title="Find Nearest YAKAP Clinic"
          />

          <Button variant="text" onPress={handleExitFlow} title="Return to YAKAP" />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  celebrationContainer: {
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: 0.5,
  },
  subtitle: {
    textAlign: 'left',
    marginTop: 16,
    lineHeight: 24,
  },
  actionContainer: {
    gap: 12,
  },
});

export default EnrollmentCompletionScreen;
