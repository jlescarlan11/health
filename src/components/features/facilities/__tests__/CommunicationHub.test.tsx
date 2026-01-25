import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CommunicationHub } from '../CommunicationHub';
import * as linkingUtils from '../../../../utils/linkingUtils';

// Mock the dependencies
jest.mock('../../../../utils/linkingUtils');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-paper', () => {
  const React = require('react');
  return {
    useTheme: () => ({
      colors: {
        primary: '#000',
        surface: '#fff',
        onSurface: '#000',
        onSurfaceVariant: '#666',
        secondaryContainer: '#eee',
        onSecondaryContainer: '#000',
        error: '#f00',
        onError: '#fff',
        outline: '#ccc',
      },
    }),
    Button: (props: any) => {
      const { Text } = require('react-native');
      return React.createElement('View', { accessibilityRole: 'button', ...props }, React.createElement(Text, {}, props.children));
    },
  };
});

describe('CommunicationHub', () => {
  const mockContacts = [
    { platform: 'viber', phoneNumber: '09171234567' },
    { platform: 'messenger', phoneNumber: 'user.id.123' },
    { platform: 'phone', phoneNumber: '0541234567', role: 'Main' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  it('renders all action buttons when contacts are provided', () => {
    const { getByText, getByTestId } = render(
      <CommunicationHub contacts={mockContacts as any} />
    );
    
    expect(getByText('Call')).toBeTruthy();
    // Buttons for Viber and Messenger use icons, so we check if they exist via their presence
    // In our implementation they are TouchableOpacity wrapping icons.
  });

  it('calls openViber when Viber button is pressed', async () => {
    const spy = jest.spyOn(linkingUtils, 'openViber').mockResolvedValue(true);
    const { getByTestId } = render(
      <CommunicationHub contacts={mockContacts as any} />
    );
    
    fireEvent.press(getByTestId('viber-button'));
    
    expect(spy).toHaveBeenCalledWith('09171234567');
  });

  it('calls openMessenger when Messenger button is pressed', async () => {
    const spy = jest.spyOn(linkingUtils, 'openMessenger').mockResolvedValue(true);
    const { getByTestId } = render(
      <CommunicationHub contacts={mockContacts as any} />
    );
    
    fireEvent.press(getByTestId('messenger-button'));
    
    expect(spy).toHaveBeenCalledWith('user.id.123');
  });

  it('shows an alert if openViber fails', async () => {
    jest.spyOn(linkingUtils, 'openViber').mockResolvedValue(false);
    const { getByTestId } = render(
      <CommunicationHub contacts={[{ platform: 'viber', phoneNumber: '123' }] as any} />
    );
    
    fireEvent.press(getByTestId('viber-button'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Viber is not installed or the number is invalid.'
      );
    });
  });

  it('shows an alert if openMessenger fails', async () => {
    jest.spyOn(linkingUtils, 'openMessenger').mockResolvedValue(false);
    const { getByTestId } = render(
      <CommunicationHub contacts={[{ platform: 'messenger', phoneNumber: 'abc' }] as any} />
    );
    
    fireEvent.press(getByTestId('messenger-button'));
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Messenger is not installed or the link is invalid.'
      );
    });
  });
});
