import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, onRetry }: { error: Error | null; onRetry: () => void }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.error }]}>
          Oops! Something went wrong.
        </Text>
        <ScrollView style={styles.errorContainer}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {error?.toString()}
          </Text>
        </ScrollView>
        <Button
          mode="contained"
          onPress={onRetry}
          style={styles.button}
          buttonColor={theme.colors.primary}
        >
          Try Again
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  errorContainer: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  button: {
    width: '100%',
  },
});
