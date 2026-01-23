import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider, Card } from 'react-native-paper';
import { TriageStatusCard, getLevelLabel } from '../TriageStatusCard';
import { theme } from '../../../../theme';
import { TriageLevel } from '../../../../types/triage';

type LevelFixture = {
  level: TriageLevel;
  icon: string;
  color: string;
  backgroundColor: string;
};

const levelFixtures: LevelFixture[] = [
  {
    level: 'emergency',
    icon: 'alert-decagram',
    color: theme.colors.error,
    backgroundColor: theme.colors.errorContainer,
  },
  {
    level: 'hospital',
    icon: 'hospital-building',
    color: theme.colors.secondary,
    backgroundColor: theme.colors.secondaryContainer,
  },
  {
    level: 'health-center',
    icon: 'medical-bag',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  {
    level: 'self-care',
    icon: 'home-heart',
    color: theme.colors.tertiary,
    backgroundColor: theme.colors.tertiaryContainer,
  },
];

const renderCard = (props: React.ComponentProps<typeof TriageStatusCard>) =>
  render(
    <PaperProvider theme={theme}>
      <TriageStatusCard {...props} />
    </PaperProvider>,
  );

describe('TriageStatusCard', () => {
  it('shows the emergency button only for emergency with callback', () => {
    const onEmergencyAction = jest.fn();
    const { getByText, getByLabelText } = renderCard({
      level: 'emergency',
      onEmergencyAction,
    });

    expect(getByText('Call Emergency Services')).toBeTruthy();
    expect(getByLabelText('Call Emergency Services')).toHaveProp(
      'accessibilityHint',
      'Calls emergency services.',
    );

    const { queryByText: queryWithoutHandler } = renderCard({
      level: 'emergency',
    });

    expect(queryWithoutHandler('Call Emergency Services')).toBeNull();

    levelFixtures
      .filter((fixture) => fixture.level !== 'emergency')
      .forEach((fixture) => {
        const { queryByText: queryNonEmergency } = renderCard({
          level: fixture.level,
          onEmergencyAction,
        });
        expect(queryNonEmergency('Call Emergency Services')).toBeNull();
      });
  });

  it('renders correct colors, icons, and layout per level', () => {
    levelFixtures.forEach((fixture) => {
      const { getByLabelText, getByText, queryByText, UNSAFE_getByType, rerender } =
        renderCard({
          level: fixture.level,
          instruction: 'Follow these instructions.',
          onEmergencyAction: jest.fn(),
        });

      const icon = getByLabelText(`${fixture.level} triage level icon`);
      expect(icon).toHaveProp('name', fixture.icon);
      expect(icon).toHaveProp('color', fixture.color);

      const levelText = getByText(getLevelLabel(fixture.level));
      expect(levelText).toHaveStyle({ color: fixture.color });

      const card = UNSAFE_getByType(Card);
      const cardStyles = StyleSheet.flatten(card.props.style);
      expect(cardStyles.backgroundColor).toBe(fixture.backgroundColor);

      expect(getByText('Follow these instructions.')).toBeTruthy();
      expect(getByText('Based on your inputs, we recommend...')).toBeTruthy();

      rerender(
        <PaperProvider theme={theme}>
          <TriageStatusCard level={fixture.level} />
        </PaperProvider>,
      );
      expect(queryByText('Follow these instructions.')).toBeNull();
    });
  });
});
