import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useTheme, List, Surface, Divider, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../components/common/Text';
import StandardHeader from '../components/common/StandardHeader';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { toggleSpecializedMode } from '../store/settingsSlice';
import { useAdaptiveUI } from '../hooks/useAdaptiveUI';
import { DigitalIDCard } from '../components';

export const SettingsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { scaleFactor } = useAdaptiveUI();
  const settings = useAppSelector((state) => state.settings);
  const specializedModes = settings?.specializedModes || {
    isSenior: false,
    isPWD: false,
    isChronic: false,
  };

  const scaledSubheaderStyle = [
    styles.subheader,
    { fontSize: styles.subheader.fontSize * scaleFactor },
  ];

  const scaledItemTitleStyle = [
    styles.itemTitle,
    { fontSize: styles.itemTitle.fontSize * scaleFactor },
  ];

  const scaledDescriptionStyle = {
    fontSize: 14 * scaleFactor,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="Settings" showBackButton={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <DigitalIDCard />
        <List.Section>
          <List.Subheader style={scaledSubheaderStyle}>My Account</List.Subheader>
          <Surface style={styles.surface} elevation={1}>
            <List.Item
              title="Edit Health Profile"
              description="Update your personal health information"
              left={(props) => (
                <List.Icon {...props} icon="account-edit-outline" color={theme.colors.primary} />
              )}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('HealthProfileEdit')}
              titleStyle={scaledItemTitleStyle}
              descriptionStyle={scaledDescriptionStyle}
            />
            <Divider />
            <List.Item
              title="My Health Records"
              description="View your assessment history"
              left={(props) => (
                <List.Icon {...props} icon="folder-account-outline" color={theme.colors.primary} />
              )}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ClinicalHistory')}
              titleStyle={scaledItemTitleStyle}
              descriptionStyle={scaledDescriptionStyle}
            />
          </Surface>
        </List.Section>

        <List.Section>
          <List.Subheader style={scaledSubheaderStyle}>Care Profile</List.Subheader>
          <Surface style={styles.surface} elevation={1}>
            <List.Item
              title="Senior"
              description="Optimize for elderly care needs"
              left={(props) => (
                <List.Icon {...props} icon="account-star-outline" color={theme.colors.primary} />
              )}
              right={() => (
                <View style={styles.switchContainer}>
                  <Switch
                    value={specializedModes.isSenior}
                    onValueChange={() => {
                      dispatch(toggleSpecializedMode('isSenior'));
                    }}
                    color={theme.colors.primary}
                  />
                </View>
              )}
              titleStyle={scaledItemTitleStyle}
              descriptionStyle={scaledDescriptionStyle}
            />
            <Divider />
            <List.Item
              title="PWD"
              description="Optimize for accessibility needs"
              left={(props) => (
                <List.Icon {...props} icon="wheelchair" color={theme.colors.primary} />
              )}
              right={() => (
                <View style={styles.switchContainer}>
                  <Switch
                    value={specializedModes.isPWD}
                    onValueChange={() => {
                      dispatch(toggleSpecializedMode('isPWD'));
                    }}
                    color={theme.colors.primary}
                  />
                </View>
              )}
              titleStyle={scaledItemTitleStyle}
              descriptionStyle={scaledDescriptionStyle}
            />
          </Surface>
        </List.Section>

        <List.Section>
          <List.Subheader style={scaledSubheaderStyle}>About</List.Subheader>
          <Surface style={styles.surface} elevation={1}>
            <List.Item
              title="Privacy Policy"
              left={(props) => <List.Icon {...props} icon="shield-account-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('PrivacyPolicy')}
              titleStyle={scaledItemTitleStyle}
              descriptionStyle={scaledDescriptionStyle}
            />
            <Divider />
            <List.Item
              title="Terms of Service"
              left={(props) => <List.Icon {...props} icon="file-document-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('TermsOfService')}
              titleStyle={scaledItemTitleStyle}
              descriptionStyle={scaledDescriptionStyle}
            />
          </Surface>
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  surface: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  subheader: {
    paddingLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  itemTitle: {
    fontSize: 16,
  },
  switchContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 8,
  },
});
