import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  FlatList,
  Text,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../common/Button';
import { FacilityContact } from '../../../types';
import { openViber, openMessenger } from '../../../utils/linkingUtils';

interface CommunicationHubProps {
  contacts?: FacilityContact[];
  primaryPhone?: string;
}

interface PhoneItem {
  phoneNumber: string;
  role?: string | null;
  contactName?: string | null;
  id?: string;
}

export const CommunicationHub: React.FC<CommunicationHubProps> = ({
  contacts = [],
  primaryPhone,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  // Filter contacts by platform
  const phoneContacts = contacts.filter((c) => c.platform === 'phone');
  const viberContacts = contacts.filter((c) => c.platform === 'viber');
  const messengerContacts = contacts.filter((c) => c.platform === 'messenger');

  const hasPhone = phoneContacts.length > 0 || !!primaryPhone;
  const hasViber = viberContacts.length > 0;
  const hasMessenger = messengerContacts.length > 0;

  const handlePhoneAction = () => {
    const allPhoneNumbers: PhoneItem[] = [
      ...(primaryPhone ? [{ phoneNumber: primaryPhone, role: 'Primary' }] : []),
      ...phoneContacts,
    ];

    if (allPhoneNumbers.length > 1) {
      setModalVisible(true);
    } else if (allPhoneNumbers.length === 1) {
      Linking.openURL(`tel:${allPhoneNumbers[0].phoneNumber}`).catch(() =>
        Alert.alert('Error', 'Failed to open dialer.'),
      );
    } else {
      Alert.alert('Not Available', 'Phone number is not available.');
    }
  };

  const handleViberAction = async () => {
    if (viberContacts.length > 0) {
      const success = await openViber(viberContacts[0].phoneNumber);
      if (!success) {
        Alert.alert('Error', 'Viber is not installed or the number is invalid.');
      }
    }
  };

  const handleMessengerAction = async () => {
    if (messengerContacts.length > 0) {
      const success = await openMessenger(messengerContacts[0].phoneNumber);
      if (!success) {
        Alert.alert('Error', 'Messenger is not installed or the link is invalid.');
      }
    }
  };

  const allPhoneNumbers: PhoneItem[] = [
    ...(primaryPhone ? [{ phoneNumber: primaryPhone, role: 'Primary' }] : []),
    ...phoneContacts,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <Button
          icon="phone"
          title="Call"
          onPress={handlePhoneAction}
          style={styles.callButton}
          variant="primary"
          disabled={!hasPhone}
        />

        {hasViber && (
          <TouchableOpacity
            testID="viber-button"
            style={[styles.iconButton, { backgroundColor: '#7360f2' }]}
            onPress={handleViberAction}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="viber" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        {hasMessenger && (
          <TouchableOpacity
            testID="messenger-button"
            style={[styles.iconButton, { backgroundColor: '#0084ff' }]}
            onPress={handleMessengerAction}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="facebook-messenger" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Phone Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 20 },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              Select Number
            </Text>
            <FlatList
              data={allPhoneNumbers}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactOption}
                  activeOpacity={0.6}
                  onPress={() => {
                    setModalVisible(false);
                    Linking.openURL(`tel:${item.phoneNumber}`);
                  }}
                >
                  <View style={styles.contactOptionContent}>
                    <View
                      style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}
                    >
                      <Ionicons name="call" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.contactNumber, { color: theme.colors.primary }]}>
                        {item.phoneNumber}
                      </Text>
                      {item.role && (
                        <Text
                          style={[styles.contactRole, { color: theme.colors.onSurfaceVariant }]}
                        >
                          {item.role} {item.contactName ? `• ${item.contactName}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ marginTop: 16, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.onSurface }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callButton: {
    flex: 1,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginVertical: 6,
  },
  contactOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 14,
  },
});
