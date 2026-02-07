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
    Modal,
} from 'react-native';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { ChatService, type Chat, type Message, type User } from '@/services/chatService';

export default function AthleteChat() {
    const { user } = useAuth();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const styles = getStyles(colors, isDark);

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [admins, setAdmins] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const scrollViewRef = useRef<ScrollView>(null);
    const currentUserId = user?.uid;

    useEffect(() => {
        if (!currentUserId) return;

        // Load coaches for new chat functionality
        loadAdmins();

        // Subscribe to user's chats
        const unsubscribe = ChatService.subscribeToUserChats(currentUserId, (updatedChats) => {
            setChats(updatedChats);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUserId]);

    useEffect(() => {
        if (!selectedChat || !currentUserId) return;

        // Subscribe to messages for the selected chat
        const unsubscribe = ChatService.subscribeToMessages(selectedChat.id, (msgs) => {
            setMessages(msgs);
            // Mark as read when messages are received/viewed
            ChatService.markAsRead(selectedChat.id, currentUserId);
        });

        return () => unsubscribe();
    }, [selectedChat, currentUserId]);

    const loadAdmins = async () => {
        try {
            const coaches = await ChatService.getCoaches();
            setAdmins(coaches);
        } catch (error) {
            console.error('Error loading coaches:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedChat || !currentUserId) return;

        try {
            await ChatService.sendMessage(selectedChat.id, currentUserId, messageText);
            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleStartChat = async (admin: User) => {
        if (!currentUserId) return;

        try {
            const athleteName = user?.displayName || 'Athlete';
            const chatObj = await ChatService.createOrGetChat(currentUserId, athleteName, admin.id);

            setSelectedChat(chatObj as Chat);
            setIsNewChatOpen(false);
        } catch (error) {
            console.error('Error starting chat:', error);
        }
    };

    const getChatDisplayName = (chat: Chat) => {
        const otherId = chat.participantIds.find((id) => id !== currentUserId);
        if (!otherId) return 'Coach';

        const admin = admins.find(a => a.id === otherId);
        return admin ? admin.displayName : 'Coach';
    };

    const filteredAdmins = admins.filter(
        (a) =>
            (a.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (a.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    // Chat list view
    if (!selectedChat) {
        return (
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Chat</Text>
                    <TouchableOpacity onPress={() => setIsNewChatOpen(true)}>
                        <Ionicons name="add-circle-outline" size={28} color={colors.tint} />
                    </TouchableOpacity>
                </View>

                {/* Chat List */}
                <ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent}>
                    {chats.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubbles-outline" size={64} color={colors.icon} />
                            <Text style={styles.emptyStateText}>No conversations yet</Text>
                            <TouchableOpacity
                                style={styles.startChatButton}
                                onPress={() => setIsNewChatOpen(true)}
                            >
                                <Text style={styles.startChatButtonText}>Start a chat</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        chats.map((chat) => {
                            const displayName = getChatDisplayName(chat);
                            const unreadCount = chat.unreadCount?.[currentUserId || ''] || 0;
                            const lastMsgTime = chat.lastMessageTime as { seconds: number } | undefined;

                            return (
                                <TouchableOpacity
                                    key={chat.id}
                                    style={styles.chatItem}
                                    onPress={() => setSelectedChat(chat)}
                                >
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{displayName[0]?.toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.chatItemContent}>
                                        <View style={styles.chatItemHeader}>
                                            <Text
                                                style={[
                                                    styles.chatItemName,
                                                    unreadCount > 0 && styles.chatItemNameUnread,
                                                ]}
                                            >
                                                {displayName}
                                            </Text>
                                            {lastMsgTime && (
                                                <Text style={styles.chatItemTime}>
                                                    {formatDistanceToNow(
                                                        new Date(lastMsgTime.seconds * 1000),
                                                        { addSuffix: true }
                                                    )}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.chatItemFooter}>
                                            <Text
                                                style={[
                                                    styles.chatItemMessage,
                                                    unreadCount > 0 && styles.chatItemMessageUnread,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {chat.lastMessage || 'No messages'}
                                            </Text>
                                            {unreadCount > 0 && (
                                                <View style={styles.unreadBadge}>
                                                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>

                {/* New Chat Modal */}
                <Modal
                    visible={isNewChatOpen}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setIsNewChatOpen(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setIsNewChatOpen(false)}>
                                <Ionicons name="close" size={28} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>New Message</Text>
                            <View style={{ width: 28 }} />
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search coaches..."
                                placeholderTextColor={colors.icon}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <ScrollView style={styles.adminList}>
                            {filteredAdmins.length === 0 ? (
                                <Text style={styles.noResultsText}>No coaches found</Text>
                            ) : (
                                filteredAdmins.map((admin) => (
                                    <TouchableOpacity
                                        key={admin.id}
                                        style={styles.adminItem}
                                        onPress={() => handleStartChat(admin)}
                                    >
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{admin.displayName?.[0]?.toUpperCase()}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.adminName}>{admin.displayName}</Text>
                                            <Text style={styles.adminRole}>{admin.role}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </Modal>
            </View>
        );
    }

    // Chat conversation view
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.chatHeaderInfo}>
                    <View style={[styles.avatar, styles.avatarSmall]}>
                        <Text style={styles.avatarTextSmall}>
                            {getChatDisplayName(selectedChat)[0]?.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.chatHeaderName}>{getChatDisplayName(selectedChat)}</Text>
                </View>
                <View style={{ width: 32 }} />
            </View>

            {/* Messages */}
            <ScrollView
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                ref={scrollViewRef}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.length === 0 ? (
                    <View style={styles.emptyMessagesState}>
                        <Text style={styles.emptyMessagesText}>No messages yet</Text>
                        <Text style={styles.emptyMessagesSubtext}>Start the conversation!</Text>
                    </View>
                ) : (
                    messages.map((message) => {
                        const isOwnMessage = message.senderId === currentUserId;
                        const createdAt = message.createdAt as { seconds: number };

                        return (
                            <View
                                key={message.id}
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
                                <Text
                                    style={[
                                        styles.messageTime,
                                        isOwnMessage ? styles.messageTimeOwn : styles.messageTimeOther,
                                    ]}
                                >
                                    {createdAt && formatDistanceToNow(new Date(createdAt.seconds * 1000), {
                                        addSuffix: true,
                                    })}
                                </Text>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Message Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.messageInput}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.icon}
                    value={messageText}
                    onChangeText={setMessageText}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!messageText.trim()}
                >
                    <Ionicons
                        name="send"
                        size={20}
                        color={messageText.trim() ? '#FFFFFF' : colors.icon}
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const getStyles = (colors: typeof Colors.light, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginTop: 40,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    chatHeaderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chatHeaderName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    chatList: {
        flex: 1,
    },
    chatListContent: {
        paddingBottom: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyStateText: {
        fontSize: 16,
        color: colors.icon,
        marginTop: 16,
        marginBottom: 24,
    },
    startChatButton: {
        backgroundColor: colors.tint,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    startChatButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    chatItem: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.tint,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    avatarTextSmall: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    chatItemContent: {
        flex: 1,
    },
    chatItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    chatItemName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    chatItemNameUnread: {
        fontWeight: '700',
    },
    chatItemTime: {
        fontSize: 10,
        color: colors.icon,
    },
    chatItemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatItemMessage: {
        fontSize: 14,
        color: colors.icon,
        flex: 1,
    },
    chatItemMessageUnread: {
        color: colors.text,
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: colors.tint,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    unreadBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
    },
    adminList: {
        flex: 1,
    },
    noResultsText: {
        textAlign: 'center',
        padding: 32,
        fontSize: 14,
        color: colors.icon,
    },
    adminItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    adminName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
    },
    adminRole: {
        fontSize: 12,
        color: colors.icon,
        textTransform: 'capitalize',
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    messagesContent: {
        padding: 16,
    },
    emptyMessagesState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyMessagesText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.icon,
    },
    emptyMessagesSubtext: {
        fontSize: 14,
        color: colors.icon,
        marginTop: 4,
    },
    messageBubble: {
        maxWidth: '75%',
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
    },
    messageBubbleOwn: {
        alignSelf: 'flex-end',
        backgroundColor: colors.tint,
        borderBottomRightRadius: 4,
    },
    messageBubbleOther: {
        alignSelf: 'flex-start',
        backgroundColor: colors.card,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    messageText: {
        fontSize: 16,
        marginBottom: 4,
    },
    messageTextOwn: {
        color: '#FFFFFF',
    },
    messageTextOther: {
        color: colors.text,
    },
    messageTime: {
        fontSize: 10,
    },
    messageTimeOwn: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    messageTimeOther: {
        color: colors.icon,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    messageInput: {
        flex: 1,
        maxHeight: 100,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: isDark ? colors.background : '#F3F4F6',
        borderRadius: 20,
        fontSize: 16,
        color: colors.text,
        marginRight: 8,
        borderWidth: isDark ? 1 : 0,
        borderColor: colors.border,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.tint,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: colors.border,
    },
});
