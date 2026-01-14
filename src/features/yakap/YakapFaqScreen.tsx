import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { YAKAP_FAQS, YakapFAQ } from './yakapContent';
import StandardHeader from '../../components/common/StandardHeader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FaqItem = ({
  faq,
  isExpanded,
  onPress,
  theme,
}: {
  faq: YakapFAQ;
  isExpanded: boolean;
  onPress: () => void;
  theme: any;
}) => (
  <View style={styles.faqItemWrapper}>
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      style={styles.faqHeader}
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
    >
      <Text
        variant="titleMedium"
        style={[
          styles.faqQuestion,
          { color: isExpanded ? theme.colors.primary : theme.colors.onSurface },
        ]}
      >
        {faq.question}
      </Text>
      <MaterialCommunityIcons
        name={isExpanded ? 'chevron-up' : 'chevron-down'}
        size={24}
        color={isExpanded ? theme.colors.primary : theme.colors.outline}
      />
    </TouchableOpacity>

    {isExpanded && (
      <View
        style={[
          styles.faqAnswerContainer,
          {
            backgroundColor: theme.colors.primaryContainer,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <Text variant="bodyMedium" style={[styles.faqAnswer, { color: theme.colors.onSurface }]}>
          {faq.answer}
        </Text>
      </View>
    )}

    {!isExpanded && (
      <View style={[styles.faqDivider, { backgroundColor: theme.colors.outlineVariant }]} />
    )}
  </View>
);

const YakapFaqScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAccordionPress = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StandardHeader title="Frequently Asked Questions" showBackButton />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.faqList}>
          {YAKAP_FAQS.map((faq) => (
            <FaqItem
              key={faq.id}
              faq={faq}
              isExpanded={expandedId === faq.id}
              onPress={() => handleAccordionPress(faq.id)}
              theme={theme}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  faqList: {
    marginTop: 8,
  },
  faqItemWrapper: {
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  faqQuestion: {
    flex: 1,
    marginRight: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  faqAnswerContainer: {
    marginTop: 4,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  faqAnswer: {
    lineHeight: 26,
    opacity: 0.9,
  },
  faqDivider: {
    height: 1,
    opacity: 0.2,
  },
});

export default YakapFaqScreen;
