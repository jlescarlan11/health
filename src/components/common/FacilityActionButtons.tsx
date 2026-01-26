import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

import { CommunicationHub } from '../features/facilities';
import { Button } from './Button';
import { FacilityContact } from '../../types';

interface FacilityActionButtonsProps {
  contacts?: FacilityContact[];
  primaryPhone?: string;
  onDirectionsPress: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  callButtonStyle?: StyleProp<ViewStyle>;
  directionButtonStyle?: StyleProp<ViewStyle>;
  directionButtonTitle?: string;
  directionButtonIcon?: string;
}

export const FacilityActionButtons: React.FC<FacilityActionButtonsProps> = ({
  contacts,
  primaryPhone,
  onDirectionsPress,
  containerStyle,
  callButtonStyle,
  directionButtonStyle,
  directionButtonTitle = 'Directions',
  directionButtonIcon = 'directions',
}) => {
  return (
    <View style={[styles.actionsContainer, containerStyle]}>
      <View style={styles.actionSlot}>
        <CommunicationHub
          contacts={contacts}
          primaryPhone={primaryPhone}
          callButtonStyle={[styles.sharedButton, callButtonStyle]}
        />
      </View>
      <View style={[styles.actionSlot, styles.secondSlot]}>
        <Button
          icon={directionButtonIcon}
          title={directionButtonTitle}
          onPress={onDirectionsPress}
          variant="primary"
          style={[styles.sharedButton, directionButtonStyle]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionSlot: {
    flex: 1,
  },
  secondSlot: {
    marginLeft: 12,
  },
  sharedButton: {
    flex: 1,
    minHeight: 48,
    marginVertical: 0,
  },
});
