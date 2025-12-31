import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Card, Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { addMessage, setLoading, setError } from '../../store/navigationSlice';
import { getGeminiResponse } from '../../services/gemini';
import { NAVIGATION_SYSTEM_PROMPT } from '../../constants/prompts';

const NavigationAssistant = () => {
  const [input, setInput] = useState('');
  const dispatch = useDispatch();
  const { chatHistory, isLoading, error } = useSelector((state: RootState) => state.navigation);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user' as const,
      timestamp: Date.now(),
    };

    dispatch(addMessage(userMessage));
    setInput('');
    dispatch(setLoading(true));

    try {
      const fullPrompt = `${NAVIGATION_SYSTEM_PROMPT}\n\nUser: ${input}\nAI:`
      const aiText = await getGeminiResponse(fullPrompt);
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: 'ai' as const,
        timestamp: Date.now(),
      };
      
      dispatch(addMessage(aiMessage));
    } catch (err) {
      dispatch(setError('Failed to get response from AI assistant.'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.scrollContent}
        >
          {chatHistory.map((msg) => (
            <View key={msg.id} style={[
              styles.messageWrapper,
              msg.sender === 'user' ? styles.userWrapper : styles.aiWrapper
            ]}>
              <Card style={[
                styles.messageCard,
                msg.sender === 'user' ? styles.userCard : styles.aiCard
              ]}>
                <Card.Content>
                  <Text style={msg.sender === 'user' ? styles.userText : styles.aiText}>
                    {msg.text}
                  </Text>
                </Card.Content>
              </Card>
            </View>
          ))}
          {isLoading && (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator animating={true} />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            mode="outlined"
            value={input}
            onChangeText={setInput}
            placeholder="Describe your symptoms..."
            style={styles.input}
            right={<TextInput.Icon icon="send" onPress={handleSend} />}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  messageCard: {
    maxWidth: '80%',
    borderRadius: 12,
  },
  userCard: {
    backgroundColor: '#6200ee',
  },
  aiCard: {
    backgroundColor: '#ffffff',
  },
  userText: {
    color: '#ffffff',
  },
  aiText: {
    color: '#000000',
  },
  loadingWrapper: {
    padding: 16,
    alignItems: 'center',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    backgroundColor: '#ffffff',
  },
});

export default NavigationAssistant;
