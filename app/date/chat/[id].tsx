import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AppColors, ChatLimits } from '@/constants/app';
import { DateChatMessage, fetchDateById, fetchDateChatMessages, fetchProfile, sendDateChatMessage } from '@/lib/api';

const ACCENT = AppColors.accent;
const CHAT_POLL_INTERVAL_MS = 4000;
const BOTTOM_PROXIMITY_THRESHOLD = 48;
const UNSEEN_BADGE_MAX_DISPLAY = 99;

export default function DateChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DateChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [dateTitle, setDateTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [unseenNewCount, setUnseenNewCount] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesScrollRef = useRef<ScrollView>(null);
  const isNearBottomRef = useRef(true);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const didInitialLoadRef = useRef(false);
  const unseenNewCountRef = useRef(0);

  useEffect(() => {
    unseenNewCountRef.current = unseenNewCount;
  }, [unseenNewCount]);

  const scrollToLatest = useCallback((animated: boolean) => {
    isNearBottomRef.current = true;
    requestAnimationFrame(() => {
      messagesScrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const updateNearBottomState = useCallback((nativeEvent: NativeScrollEvent) => {
    const distanceFromBottom =
      nativeEvent.contentSize.height - nativeEvent.layoutMeasurement.height - nativeEvent.contentOffset.y;
    const isNearBottom = distanceFromBottom <= BOTTOM_PROXIMITY_THRESHOLD;
    isNearBottomRef.current = isNearBottom;
    if (isNearBottom && unseenNewCountRef.current > 0) {
      setUnseenNewCount(0);
    }
  }, []);

  const handleMessagesScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateNearBottomState(event.nativeEvent);
    },
    [updateNearBottomState],
  );

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const list = await fetchDateChatMessages(id);
      const nextLastMessageId = list.length > 0 ? list[list.length - 1].id : null;
      const previousLastMessageId = previousLastMessageIdRef.current;
      const hasNewMessages =
        didInitialLoadRef.current &&
        nextLastMessageId !== previousLastMessageId &&
        nextLastMessageId !== null;

      setMessages(list);
      if (!didInitialLoadRef.current) {
        didInitialLoadRef.current = true;
        setUnseenNewCount(0);
        scrollToLatest(false);
      } else if (hasNewMessages) {
        if (isNearBottomRef.current) {
          setUnseenNewCount(0);
          scrollToLatest(true);
        } else {
          const previousLastIndex = previousLastMessageId
            ? list.findIndex((message) => message.id === previousLastMessageId)
            : -1;
          const newlyArrivedCount =
            previousLastIndex >= 0 ? list.length - previousLastIndex - 1 : list.length;
          setUnseenNewCount((current) => current + Math.max(newlyArrivedCount, 1));
        }
      }
      previousLastMessageIdRef.current = nextLastMessageId;
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chat messages.');
    } finally {
      setLoading(false);
    }
  }, [id, scrollToLatest]);

  useEffect(() => {
    fetchProfile()
      .then((profile) => setCurrentUserId(profile.id))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchDateById(id)
      .then((date) => setDateTitle(date.title ?? ''))
      .catch(() => {});
  }, [id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Date chat',
      headerRight: () =>
        dateTitle ? (
          <View style={styles.headerDateChip}>
            <Text style={styles.headerDateChipText} numberOfLines={1}>
              {dateTitle}
            </Text>
          </View>
        ) : null,
    });
  }, [navigation, dateTitle]);

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setInterval> | null = null;
      didInitialLoadRef.current = false;
      previousLastMessageIdRef.current = null;
      isNearBottomRef.current = true;
      setUnseenNewCount(0);
      loadMessages();
      timer = setInterval(() => {
        loadMessages();
      }, CHAT_POLL_INTERVAL_MS);
      return () => {
        if (timer) clearInterval(timer);
      };
    }, [loadMessages]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
      setUnseenNewCount(0);
      scrollToLatest(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const unseenNewLabel =
    unseenNewCount > UNSEEN_BADGE_MAX_DISPLAY
      ? `${UNSEEN_BADGE_MAX_DISPLAY}+ new`
      : unseenNewCount === 1
        ? '1 new'
        : `${unseenNewCount} new`;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        style={styles.container}
      >
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <ScrollView
          ref={messagesScrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          persistentScrollbar={Platform.OS === 'android'}
          indicatorStyle={Platform.OS === 'ios' ? 'black' : undefined}
          onScroll={handleMessagesScroll}
          scrollEventThrottle={16}
        >
          {messages.length === 0 ? <Text style={styles.emptyText}>No messages yet.</Text> : null}
          {messages.map((message) => {
            const mine = currentUserId != null && message.senderId === currentUserId;
            return (
              <View key={message.id} style={[styles.messageRow, mine ? styles.myMessageRow : styles.theirMessageRow]}>
                {!mine ? (
                  <View style={styles.messageIcon}>
                    <MaterialIcons name="person" size={16} color="#6b6b73" />
                  </View>
                ) : null}
                <View style={[styles.messageBubble, mine ? styles.myMessage : styles.theirMessage]}>
                  <Text style={[styles.messageText, mine ? styles.myMessageText : undefined]}>{message.message}</Text>
                  <Text style={[styles.metaText, mine ? styles.myMetaText : undefined]}>
                    {new Date(message.createdAt).toLocaleString()}
                  </Text>
                </View>
                {mine ? (
                  <View style={styles.messageIcon}>
                    <MaterialIcons name="person" size={16} color="#fff" />
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
        {unseenNewCount > 0 ? (
          <Pressable
            onPress={() => {
              setUnseenNewCount(0);
              scrollToLatest(true);
            }}
            style={[
              styles.newMessagesButton,
              Platform.OS === 'android' && keyboardHeight > 0 ? { bottom: keyboardHeight + 76 } : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Jump to latest chat messages"
            accessibilityHint="Scroll to the newest unseen messages"
          >
            <View style={styles.newMessagesButtonContent}>
              <MaterialIcons name="keyboard-arrow-down" size={16} color="#fff" />
              <Text style={styles.newMessagesButtonText}>{unseenNewLabel}</Text>
            </View>
          </Pressable>
        ) : null}
        <View style={[styles.composerRow, Platform.OS === 'android' && keyboardHeight > 0 ? { marginBottom: keyboardHeight } : null]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onFocus={() => {
              scrollToLatest(true);
            }}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            accessibilityLabel="Chat message input"
            accessibilityHint="Type your message to the date participant"
            multiline
            maxLength={ChatLimits.messageMaxLength}
          />
          <Pressable
            style={({ pressed }) => [styles.sendButton, pressed && styles.pressed]}
            onPress={handleSend}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityHint="Send the typed chat message"
          >
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
    paddingTop: 0,
  },
  headerDateChip: {
    maxWidth: 170,
    borderRadius: 12,
    backgroundColor: '#ffe5ef',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#ffd0e0',
  },
  headerDateChipText: {
    color: '#7a2044',
    fontSize: 12,
    fontWeight: '600',
  },
  error: {
    color: '#b00020',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
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
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f4',
    marginBottom: 2,
  },
  myMessage: {
    backgroundColor: ACCENT,
  },
  theirMessage: {
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
    paddingHorizontal: 16,
  },
  newMessagesButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 76,
    borderRadius: 14,
    backgroundColor: '#6b6b73',
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
    elevation: 4,
  },
  newMessagesButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  newMessagesButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
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
