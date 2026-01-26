import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, useTheme, List, Surface, Divider, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import StandardHeader from '../components/common/StandardHeader';
import { useAppDispatch, useAppSelector } from '../hooks/reduxHooks';
import { toggleSpecializedMode } from '../store/settingsSlice';

export const SettingsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const specializedModes = settings?.specializedModes || {
    isSenior: false,
    isPWD: false,
    isChronic: false,
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['left', 'right']}
    >
      <StandardHeader title="Settings" showBackButton={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <List.Section>
          <List.Subheader style={styles.subheader}>My Account</List.Subheader>
          <Surface style={styles.surface} elevation={1}>
            <List.Item
              title="My Health Records"
              description="View your assessment history"
              left={(props) => (
                <List.Icon {...props} icon="folder-account-outline" color={theme.colors.primary} />
              )}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ClinicalHistory')}
              titleStyle={styles.itemTitle}
            />
          </Surface>
        </List.Section>

        <List.Section>
          <List.Subheader style={styles.subheader}>Care Profile</List.Subheader>
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
              titleStyle={styles.itemTitle}
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
              titleStyle={styles.itemTitle}
            />
          </Surface>
        </List.Section>

        <List.Section>
          <List.Subheader style={styles.subheader}>About</List.Subheader>
          <Surface style={styles.surface} elevation={1}>
            <List.Item
              title="Privacy Policy"
              left={(props) => <List.Icon {...props} icon="shield-account-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('PrivacyPolicy')}
              titleStyle={styles.itemTitle}
            />
            <Divider />
            <List.Item
              title="Terms of Service"
              left={(props) => <List.Icon {...props} icon="file-document-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('TermsOfService')}
              titleStyle={styles.itemTitle}
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
