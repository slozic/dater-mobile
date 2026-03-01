import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { DateChatMessage, fetchDateChatMessages, fetchProfile, sendDateChatMessage } from '@/lib/api';

const ACCENT = '#ff5c8a';

export default function DateChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DateChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const list = await fetchDateChatMessages(id);
      setMessages(list);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat messages.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProfile()
      .then((profile) => setCurrentUserId(profile.id))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setInterval> | null = null;
      loadMessages();
      timer = setInterval(() => {
        loadMessages();
      }, 4000);
      return () => {
        if (timer) clearInterval(timer);
      };
    }, [loadMessages]),
  );

  const handleSend = async () => {
    if (!id) return;
    const message = draft.trim();
    if (!message) {
      return;
    }
    setSending(true);
    try {
      await sendDateChatMessage(id, message);
      setDraft('');
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.title}>Chat</Text>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
          {messages.length === 0 ? <Text style={styles.emptyText}>No messages yet.</Text> : null}
          {messages.map((message) => {
            const mine = currentUserId != null && message.senderId === currentUserId;
            return (
              <View key={message.id} style={[styles.messageBubble, mine ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, mine ? styles.myMessageText : undefined]}>{message.message}</Text>
                <Text style={[styles.metaText, mine ? styles.myMetaText : undefined]}>
                  {new Date(message.createdAt).toLocaleString()}
                </Text>
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.composerRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            multiline
            maxLength={1000}
          />
          <Pressable style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]} onPress={handleSend} disabled={sending}>
            <Text style={styles.sendButtonText}>{sending ? '...' : 'Send'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7fb',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b1b1f',
    marginBottom: 8,
  },
  error: {
    color: '#b00020',
    marginBottom: 8,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    gap: 8,
    paddingVertical: 8,
  },
  emptyText: {
    color: '#6b6b73',
    textAlign: 'center',
    marginTop: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: ACCENT,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#ececf2',
  },
  messageText: {
    color: '#1b1b1f',
    fontSize: 14,
  },
  myMessageText: {
    color: '#fff',
  },
  metaText: {
    marginTop: 4,
    color: '#666',
    fontSize: 11,
  },
  myMetaText: {
    color: '#ffe5ef',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d7d7e0',
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#111',
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 120,
  },
  sendButton: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
