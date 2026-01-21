import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { ConfidenceSignal } from '../ConfidenceSignal';
import { theme } from '../../../../theme';

describe('ConfidenceSignal', () => {
  it('renders correctly with safety message', () => {
    const { getByText, getByLabelText } = render(
      <PaperProvider theme={theme}>
        <ConfidenceSignal />
      </PaperProvider>
    );

    expect(getByText('Safety Note')).toBeTruthy();
    expect(getByText(/We’ve recommended a slightly higher level of care/)).toBeTruthy();
    expect(getByLabelText(/Safety Note: We’ve recommended a slightly higher level of care/)).toBeTruthy();
  });
});
