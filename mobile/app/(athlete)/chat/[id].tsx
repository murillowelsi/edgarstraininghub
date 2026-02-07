import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { ChatService, type Message } from '@/services/chatService';

export default function ChatDetailScreen() {
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const { user } = useAuth();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const styles = getStyles(colors, isDark);

    const [messages, setMessages] = useState<Message[]>([]);
    const [messageText, setMessageText] = useState('');

    const scrollViewRef = useRef<ScrollView>(null);
    const currentUserId = user?.uid;

    useEffect(() => {
        if (!id || !currentUserId) return;

        // Subscribe to messages for the selected chat
        const unsubscribe = ChatService.subscribeToMessages(id, (msgs) => {
            setMessages(msgs);
            // Mark as read when messages are received/viewed
            ChatService.markAsRead(id, currentUserId);
        });

        return () => unsubscribe();
    }, [id, currentUserId]);

    const handleSendMessage = async () => {
        if (!messageText.trim() || !id || !currentUserId) return;

        try {
            await ChatService.sendMessage(id, currentUserId, messageText);
            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const displayName = name || 'Chat';
    const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    if (!id) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Chat Header */}
                <View style={styles.chatHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.tint} />
                    </TouchableOpacity>

                    <View style={styles.chatHeaderInfo}>
                        <View style={styles.headerAvatar}>
                            <Text style={styles.headerAvatarText}>
                                {initials}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.chatHeaderName}>{displayName}</Text>
                            <Text style={styles.chatHeaderStatus}>Trainer</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.headerActionButton}>
                        <Ionicons name="ellipsis-horizontal" size={24} color={colors.tint} />
                    </TouchableOpacity>
                </View>

                {/* Messages */}
                <ScrollView
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    ref={scrollViewRef}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                >
                    {messages.length === 0 ? (
                        <View style={styles.emptyMessagesState}>
                            <View style={styles.emptyConversationIcon}>
                                <Ionicons name="hand-left-outline" size={40} color={colors.tint} />
                            </View>
                            <Text style={styles.emptyMessagesText}>Say Hello!</Text>
                            <Text style={styles.emptyMessagesSubtext}>Start your conversation.</Text>
                        </View>
                    ) : (
                        messages.map((message, index) => {
                            const isOwnMessage = message.senderId === currentUserId;
                            const createdAt = message.createdAt as { seconds: number };
                            const prevMessage = messages[index - 1];
                            const isSameSender = prevMessage && prevMessage.senderId === message.senderId;

                            // Calculate transparency for timestamps
                            const showTimestamp = !isSameSender || (createdAt && prevMessage?.createdAt && (createdAt.seconds - (prevMessage.createdAt as any).seconds > 300));

                            return (
                                <View key={message.id} style={{ marginBottom: isSameSender ? 4 : 16 }}>
                                    {showTimestamp && createdAt && (
                                        <Text style={styles.timestampCenter}>
                                            {format(new Date(createdAt.seconds * 1000), 'MMM d, h:mm a')}
                                        </Text>
                                    )}
                                    <View
                                        style={[
                                            styles.messageRow,
                                            isOwnMessage ? styles.messageRowOwn : styles.messageRowOther
                                        ]}
                                    >
                                        {!isOwnMessage && !isSameSender && (
                                            <View style={styles.messageAvatar}>
                                                <Text style={styles.messageAvatarText}>
                                                    {initials[0]}
                                                </Text>
                                            </View>
                                        )}
                                        {!isOwnMessage && isSameSender && <View style={styles.messageAvatarPlaceholder} />}

                                        <View
                                            style={[
                                                styles.messageBubble,
                                                isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.messageText,
                                                    isOwnMessage ? styles.messageTextOwn : styles.messageTextOther,
                                                ]}
                                            >
                                                {message.text}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </ScrollView>

                {/* Message Input */}
                <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                        <TouchableOpacity style={styles.attachButton}>
                            <Ionicons name="add" size={24} color={colors.tint} />
                        </TouchableOpacity>

                        <TextInput
                            style={styles.messageInput}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.icon}
                            value={messageText}
                            onChangeText={setMessageText}
                            multiline
                            maxLength={1000}
                        />

                        {messageText.trim().length > 0 ? (
                            <TouchableOpacity
                                style={styles.sendButton}
                                onPress={handleSendMessage}
                            >
                                <Ionicons name="arrow-up" size={20} color="#0F172A" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.micButton}>
                                <Ionicons name="mic-outline" size={24} color={colors.icon} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors: typeof Colors.light, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardContainer: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    chatHeaderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.tint,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    headerAvatarText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    chatHeaderName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },
    chatHeaderStatus: {
        fontSize: 11,
        color: colors.icon,
        textAlign: 'center',
    },
    headerActionButton: {
        padding: 8,
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    messagesContent: {
        padding: 16,
        paddingBottom: 24,
    },
    emptyMessagesState: {
        alignItems: 'center',
        paddingVertical: 64,
        opacity: 0.7,
    },
    emptyConversationIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: isDark ? 'rgba(225, 173, 15, 0.1)' : '#FEF9C3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyMessagesText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    emptyMessagesSubtext: {
        fontSize: 16,
        color: colors.icon,
    },
    timestampCenter: {
        textAlign: 'center',
        fontSize: 11,
        color: colors.icon,
        marginVertical: 12,
        fontWeight: '500',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 1,
    },
    messageRowOwn: {
        justifyContent: 'flex-end',
    },
    messageRowOther: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginBottom: 4,
    },
    messageAvatarPlaceholder: {
        width: 28,
        marginRight: 8,
    },
    messageAvatarText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.text,
    },
    messageBubble: {
        maxWidth: '75%',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    messageBubbleOwn: {
        alignSelf: 'flex-end',
        backgroundColor: colors.tint,
        borderBottomRightRadius: 4,
    },
    messageBubbleOther: {
        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    messageTextOwn: {
        color: '#0F172A',
        fontWeight: '500',
    },
    messageTextOther: {
        color: colors.text,
    },
    inputWrapper: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Platform.OS === 'ios' ? 0 : 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    attachButton: {
        padding: 10,
        marginBottom: 1,
    },
    micButton: {
        padding: 10,
        marginBottom: 1,
    },
    messageInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: isDark ? colors.card : '#F3F4F6',
        borderRadius: 24,
        fontSize: 16,
        color: colors.text,
        marginHorizontal: 4,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.tint,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
});
