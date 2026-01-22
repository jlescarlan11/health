import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { TriageLogic } from '../../../types/triage';
import { t } from '../../../locales';

interface ConfidenceSignalProps {
  missingFields?: string[];
  isRecentResolved?: boolean;
  triage_logic?: TriageLogic;
}

export const ConfidenceSignal = ({
  missingFields = [],
  isRecentResolved = false,
  triage_logic,
}: ConfidenceSignalProps) => {
  const theme = useTheme();

  // Map triage adjustment rules to translation keys for consistent messaging.
  const ruleExplanationKeys: Record<string, string> = {
    READINESS_UPGRADE: 'safety_note.readiness_upgrade',
    RED_FLAG_UPGRADE: 'safety_note.red_flag_upgrade',
    RECENT_RESOLVED_FLOOR: 'safety_note.recent_resolved_floor',
    SYSTEM_BASED_LOCK_CARDIAC: 'safety_note.system_based_lock_cardiac',
    SYSTEM_BASED_LOCK_RESPIRATORY: 'safety_note.system_based_lock_respiratory',
    SYSTEM_BASED_LOCK_NEUROLOGICAL: 'safety_note.system_based_lock_neurological',
    SYSTEM_BASED_LOCK_TRAUMA: 'safety_note.system_based_lock_trauma',
    SYSTEM_BASED_LOCK_ABDOMEN: 'safety_note.system_based_lock_abdomen',
    CONSENSUS_CHECK: 'safety_note.consensus_check',
    AGE_ESCALATION: 'safety_note.age_escalation',
    MENTAL_HEALTH_OVERRIDE: 'safety_note.mental_health_override',
    OFFLINE_FALLBACK: 'safety_note.offline_fallback',
    MANUAL_OVERRIDE: 'safety_note.manual_override',
    AUTHORITY_BLOCK: 'safety_note.authority_block',
    AUTHORITY_DOWNGRADE: 'safety_note.authority_block',
  };

  const fallbackKey = 'safety_note.fallback';

  // Legacy message selection for older callers that do not pass triage_logic.
  const getLegacyMessage = () => {
    if (isRecentResolved) {
      return t('safety_note.legacy_recent_resolved');
    }
    if (missingFields.length > 0) {
      const list =
        missingFields.length === 1
          ? missingFields[0]
          : `${missingFields.slice(0, -1).join(', ')} and ${missingFields[missingFields.length - 1]}`;
      const verb = missingFields.length > 1 ? 'were' : 'was';
      return t('safety_note.legacy_missing_fields', { list, verb });
    }
    return t('safety_note.legacy_complex_or_vague');
  };

  // Determine if the metadata represents a higher care recommendation.
  const getUpgradeMessage = () => {
    if (!triage_logic) return null;

    const { original_level: originalLevel, final_level: finalLevel, adjustments } = triage_logic;

    // Validate the minimal shape to avoid crashes on partial metadata.
    if (!originalLevel || !finalLevel) return null;

    const levelOrder = ['self_care', 'health_center', 'hospital', 'emergency'];
    const originalIndex = levelOrder.indexOf(originalLevel);
    const finalIndex = levelOrder.indexOf(finalLevel);

    // Only surface the note if the final level is higher than the original.
    if (originalIndex === -1 || finalIndex === -1 || finalIndex <= originalIndex) {
      return null;
    }

    // Prefer the most recent adjustment rule for the explanation.
    const lastAdjustment = adjustments?.length ? adjustments[adjustments.length - 1] : null;
    if (lastAdjustment?.rule && ruleExplanationKeys[lastAdjustment.rule]) {
      return t(ruleExplanationKeys[lastAdjustment.rule]);
    }

    // If no known rule is available, provide a neutral fallback message.
    return t(fallbackKey);
  };

  const upgradeMessage = getUpgradeMessage();
  const message = upgradeMessage ?? getLegacyMessage();

  // Hide the component when triage_logic explicitly indicates no upgrade.
  if (triage_logic && !upgradeMessage) {
    return null;
  }

  return (
    <Surface
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.elevation.level1,
          borderLeftColor: theme.colors.primary,
        },
      ]}
      elevation={0}
      accessibilityRole="alert"
      accessibilityLabel={`${t('safety_note.title')}: ${message}`}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="shield-check-outline"
          size={24}
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.textContainer}>
        <Text variant="labelLarge" style={[styles.title, { color: theme.colors.primary }]}>
          {t('safety_note.title')}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
        >
          {message}
        </Text>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    lineHeight: 18,
  },
});
