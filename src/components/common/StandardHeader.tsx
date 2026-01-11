import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';

interface StandardHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}

const StandardHeader: React.FC<StandardHeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  rightActions,
  style,
  titleStyle,
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  // #region agent log
  const containerHeight = styles.container.height;
  const containerPaddingHorizontal = styles.container.paddingHorizontal;
  fetch('http://127.0.0.1:7243/ingest/30defc92-940a-4196-8b8c-19e76254013a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'StandardHeader.tsx:24', message: 'StandardHeader render', data: { height: containerHeight, paddingHorizontal: containerPaddingHorizontal, title, showBackButton, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' } }) }).catch(() => {});
  // #endregion

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.outlineVariant }, style]}>
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Navigates to the previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.colors.onSurface }, titleStyle]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <View style={styles.rightContainer}>{rightActions}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftContainer: {
    width: '20%',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    width: '20%',
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 8,
    marginLeft: -8, 
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default StandardHeader;