import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../../common/Button';
import { TriageLevel } from '../../../types/triage';

interface TriageStatusCardProps {
  level: TriageLevel;
  instruction?: string;
  onEmergencyAction?: () => void;
}

type ThemeColors = ReturnType<typeof useTheme>['colors'];

const LEVEL_LABELS: Record<TriageLevel, string> = {
  emergency: 'Emergency (Life-Threatening)',
  hospital: 'Hospital (Specialized Care)',
  'health-center': 'Health Center (Primary Care)',
  'self-care': 'Self Care (Home Management)',
};

export const getLevelLabel = (level: TriageLevel) => LEVEL_LABELS[level] ?? level;

const RECOMMENDATION_INTRO = 'Based on your inputs, we recommend...';

export const TriageStatusCard: React.FC<TriageStatusCardProps> = ({
  level,
  instruction,
  onEmergencyAction,
}) => {
  const theme = useTheme() as ReturnType<typeof useTheme> & { spacing: ThemeSpacing };
  const spacing = theme.spacing;
  const levelConfig = getLevelConfig(level, theme.colors);
  const showEmergencyButton = level === 'emergency' && Boolean(onEmergencyAction);
  const levelLabel = getLevelLabel(level);

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: levelConfig.backgroundColor,
          shadowColor: theme.colors.shadow,
          padding: spacing.lg,
        },
      ]}
      mode="contained"
      accessible={true}
      accessibilityRole="text"
    >
      <View style={[styles.content, { gap: spacing.md }]}>
        <View style={styles.iconRow}>
          <MaterialCommunityIcons
            name={levelConfig.icon}
            size={36}
            color={levelConfig.foregroundColor}
            accessibilityLabel={`${level} triage level icon`}
          />
        </View>
        <Text variant="bodySmall" style={[styles.introText, { color: levelConfig.contentColor }]}>
          {RECOMMENDATION_INTRO}
        </Text>
        <Text
          variant="headlineMedium"
          style={[
            styles.primaryLabel,
            { color: levelConfig.foregroundColor, lineHeight: 34, letterSpacing: 0.5 },
          ]}
          accessibilityRole="header"
        >
          {levelLabel}
        </Text>
        {instruction ? (
          <Text
            variant="bodyMedium"
            style={[styles.justificationText, { color: levelConfig.contentColor }]}
          >
            {instruction.trim()}
          </Text>
        ) : null}
        {showEmergencyButton ? (
          <View style={[styles.actionContainer, { marginTop: spacing.sm }]}>
            <Button
              title="Call Emergency Services"
              variant="danger"
              onPress={onEmergencyAction}
              icon="phone"
              accessibilityHint="Calls emergency services."
            />
          </View>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    elevation: 2,
  },
  content: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontWeight: '800',
    textAlign: 'center',
  },
  introText: {
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  justificationText: {
    textAlign: 'justify',
    lineHeight: 22,
  },
  actionContainer: {
    width: '100%',
  },
});

type ThemeSpacing = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
};

const getLevelConfig = (
  level: TriageLevel,
  colors: ThemeColors,
): {
  icon: keyof (typeof MaterialCommunityIcons)['glyphMap'];
  backgroundColor: string;
  foregroundColor: string;
  contentColor: string;
} => {
  const levelMap: Record<TriageLevel, LevelConfig> = {
    emergency: {
      icon: 'alert-decagram',
      foregroundColor: colors.error,
      backgroundColor: colors.errorContainer,
      contentColor: colors.onSurface,
    },
    hospital: {
      icon: 'hospital-building',
      foregroundColor: colors.secondary,
      backgroundColor: colors.secondaryContainer,
      contentColor: colors.onSurface,
    },
    'health-center': {
      icon: 'medical-bag',
      foregroundColor: colors.onPrimary,
      backgroundColor: colors.primary,
      contentColor: colors.onPrimary,
    },
    'self-care': {
      icon: 'home-heart',
      foregroundColor: colors.tertiary,
      backgroundColor: colors.tertiaryContainer,
      contentColor: colors.onSurface,
    },
  };

  return levelMap[level];
};

type LevelConfig = {
  icon: keyof (typeof MaterialCommunityIcons)['glyphMap'];
  backgroundColor: string;
  foregroundColor: string;
  contentColor: string;
};
