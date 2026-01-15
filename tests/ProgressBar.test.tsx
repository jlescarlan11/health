import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressBar } from '../src/components/common/ProgressBar';
import { theme } from '../src/theme';
import { PaperProvider } from 'react-native-paper';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <PaperProvider theme={theme}>
      {component}
    </PaperProvider>
  );
};

describe('ProgressBar', () => {
  it('renders correctly with default props', () => {
    const { getByRole } = renderWithTheme(<ProgressBar progress={0.5} animated={false} />);
    const progressBar = getByRole('progressbar');
    expect(progressBar).toBeTruthy();
  });

  it('renders with label and percentage', () => {
    const { getByText } = renderWithTheme(
      <ProgressBar progress={0.75} label="Loading" showPercentage animated={false} />
    );
    expect(getByText('Loading')).toBeTruthy();
    expect(getByText('75%')).toBeTruthy();
  });

  it('clamps progress between 0 and 1', () => {
    const { getByRole } = renderWithTheme(<ProgressBar progress={1.5} animated={false} />);
    const progressBar = getByRole('progressbar');
    // accessibilityValue now should be 100
    expect(progressBar.props.accessibilityValue.now).toBe(100);
    
    const { getByRole: getByRoleMin } = renderWithTheme(<ProgressBar progress={-0.5} animated={false} />);
    const progressBarMin = getByRoleMin('progressbar');
    expect(progressBarMin.props.accessibilityValue.now).toBe(0);
  });
});
