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
      </PaperProvider>,
    );

    expect(getByText('Safety Note')).toBeTruthy();
    expect(getByText(/Recommended higher care level because your symptoms/)).toBeTruthy();
    expect(
      getByLabelText(/Safety Note: Recommended higher care level because your symptoms/),
    ).toBeTruthy();
  });

  it('renders correctly with specific missing fields', () => {
    const missingFields = ['Age', 'Severity'];
    const { getByText } = render(
      <PaperProvider theme={theme}>
        <ConfidenceSignal missingFields={missingFields} />
      </PaperProvider>,
    );

    expect(getByText(/Recommended higher care level because Age and Severity were unclear/)).toBeTruthy();
  });

  it('renders correctly with a single missing field', () => {
    const missingFields = ['Duration'];
    const { getByText } = render(
      <PaperProvider theme={theme}>
        <ConfidenceSignal missingFields={missingFields} />
      </PaperProvider>,
    );

    expect(getByText(/Recommended higher care level because Duration was unclear/)).toBeTruthy();
  });
});
