import React from 'react';
import { render } from '@testing-library/react-native';
import { BusynessIndicator } from '../BusynessIndicator';

describe('BusynessIndicator', () => {
  const mockBusyness = {
    status: 'quiet' as const,
    score: 0.2,
  };

  it('renders correctly when isVisible is true and busyness is provided', () => {
    const { getByText } = render(<BusynessIndicator busyness={mockBusyness} isVisible={true} />);
    expect(getByText('Not Busy')).toBeTruthy();
  });

  it('returns null when isVisible is false', () => {
    const { queryByText } = render(<BusynessIndicator busyness={mockBusyness} isVisible={false} />);
    expect(queryByText('Quiet Now')).toBeNull();
  });

  it('returns null when busyness is undefined', () => {
    const { queryByText } = render(<BusynessIndicator busyness={undefined} isVisible={true} />);
    expect(queryByText('Quiet Now')).toBeNull();
  });

  it('shows separator by default', () => {
    const { getByText } = render(<BusynessIndicator busyness={mockBusyness} isVisible={true} />);
    expect(getByText('•')).toBeTruthy();
  });

  it('hides separator when showSeparator is false', () => {
    const { queryByText } = render(
      <BusynessIndicator busyness={mockBusyness} isVisible={true} showSeparator={false} />,
    );
    expect(queryByText('•')).toBeNull();
  });
});
