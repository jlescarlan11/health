import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { View, Text } from 'react-native';

test('renders correctly', () => {
  render(
    <View>
      <Text>Hello Test</Text>
    </View>,
  );
  expect(screen.getByText('Hello Test')).toBeTruthy();
});
