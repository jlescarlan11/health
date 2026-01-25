import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Text, useTheme, List, Surface, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import StandardHeader from '../components/common/StandardHeader';

export const SettingsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();

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
              left={props => <List.Icon {...props} icon="folder-account-outline" color={theme.colors.primary} />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('ClinicalHistory')}
              titleStyle={styles.itemTitle}
            />
          </Surface>
        </List.Section>

        <List.Section>
            <List.Subheader style={styles.subheader}>About</List.Subheader>
            <Surface style={styles.surface} elevation={1}>
                <List.Item
                    title="Privacy Policy"
                    left={props => <List.Icon {...props} icon="shield-account-outline" />}
                    right={props => <List.Icon {...props} icon="chevron-right" />}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                    titleStyle={styles.itemTitle}
                />
                <Divider />
                <List.Item
                    title="Terms of Service"
                    left={props => <List.Icon {...props} icon="file-document-outline" />}
                    right={props => <List.Icon {...props} icon="chevron-right" />}
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
  }
});
