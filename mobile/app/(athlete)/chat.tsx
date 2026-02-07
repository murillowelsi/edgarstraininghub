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
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { formatDistanceToNow, format } from 'date-fns';
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
            <SafeAreaView style={styles.container} edges={['bottom']}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity onPress={() => setIsNewChatOpen(true)} style={styles.newChatButton}>
                        <Ionicons name="create-outline" size={26} color={colors.tint} />
                    </TouchableOpacity>
                </View>

                {/* Subheader / Search placeholder */}
                <View style={styles.subheader}>
                    <Text style={styles.subheaderText}>All Conversations</Text>
                </View>

                {/* Chat List */}
                <ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent}>
                    {chats.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="chatbubbles" size={48} color={colors.tint} />
                            </View>
                            <Text style={styles.emptyStateText}>No conversations yet</Text>
                            <Text style={styles.emptyStateSubtext}>Start chatting with your coach!</Text>
                            <TouchableOpacity
                                style={styles.startChatMainButton}
                                onPress={() => setIsNewChatOpen(true)}
                            >
                                <Text style={styles.startChatMainButtonText}>Start a chat</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        chats.map((chat) => {
                            const displayName = getChatDisplayName(chat);
                            const unreadCount = chat.unreadCount?.[currentUserId || ''] || 0;
                            const lastMsgTime = chat.lastMessageTime as { seconds: number } | undefined;
                            const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                            return (
                                <TouchableOpacity
                                    key={chat.id}
                                    style={styles.chatItem}
                                    onPress={() => setSelectedChat(chat)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.avatarContainer}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{initials}</Text>
                                        </View>
                                        {unreadCount > 0 && <View style={styles.unreadDot} />}
                                    </View>

                                    <View style={styles.chatItemContent}>
                                        <View style={styles.chatItemHeader}>
                                            <Text
                                                style={[
                                                    styles.chatItemName,
                                                    unreadCount > 0 && styles.chatItemNameUnread,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {displayName}
                                            </Text>
                                            {lastMsgTime && (
                                                <Text style={styles.chatItemTime}>
                                                    {formatDistanceToNow(
                                                        new Date(lastMsgTime.seconds * 1000),
                                                        { addSuffix: false }
                                                    ).replace('about ', '')}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.chatItemFooter}>
                                            <Text
                                                style={[
                                                    styles.chatItemMessage,
                                                    unreadCount > 0 && styles.chatItemMessageTextUnread,
                                                ]}
                                                numberOfLines={2}
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
                                    <Ionicons name="chevron-forward" size={16} color={colors.border} style={{ marginLeft: 8 }} />
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
                            <Text style={styles.modalTitle}>New Message</Text>
                            <TouchableOpacity onPress={() => setIsNewChatOpen(false)} style={styles.closeModalButton}>
                                <Ionicons name="close-circle" size={30} color={colors.icon} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search coaches..."
                                placeholderTextColor={colors.icon}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                        </View>

                        <ScrollView style={styles.adminList}>
                            {filteredAdmins.length === 0 ? (
                                <View style={styles.noResultsContainer}>
                                    <Ionicons name="search-outline" size={48} color={colors.icon} />
                                    <Text style={styles.noResultsText}>No coaches found</Text>
                                </View>
                            ) : (
                                filteredAdmins.map((admin) => (
                                    <TouchableOpacity
                                        key={admin.id}
                                        style={styles.adminItem}
                                        onPress={() => handleStartChat(admin)}
                                    >
                                        <View style={styles.avatarSmall}>
                                            <Text style={styles.avatarTextSmall}>{admin.displayName?.[0]?.toUpperCase()}</Text>
                                        </View>
                                        <View style={styles.adminInfo}>
                                            <Text style={styles.adminName}>{admin.displayName}</Text>
                                            <Text style={styles.adminRole}>{admin.role}</Text>
                                        </View>
                                        <Ionicons name="chatbubble-outline" size={24} color={colors.tint} />
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </Modal>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Chat Header */}
                <View style={styles.chatHeader}>
                    <TouchableOpacity onPress={() => setSelectedChat(null)} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.tint} />
                    </TouchableOpacity>

                    <View style={styles.chatHeaderInfo}>
                        <View style={styles.headerAvatar}>
                            <Text style={styles.headerAvatarText}>
                                {getChatDisplayName(selectedChat).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.chatHeaderName}>{getChatDisplayName(selectedChat)}</Text>
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
                            <Text style={styles.emptyMessagesSubtext}>Start your conversation with your coach.</Text>
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
                                                    {getChatDisplayName(selectedChat)[0].toUpperCase()}
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
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    newChatButton: {
        padding: 8,
        marginRight: -8,
    },
    subheader: {
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    subheaderText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.icon,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chatList: {
        flex: 1,
    },
    chatListContent: {
        paddingVertical: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center', // Center vertically in available space
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: isDark ? 'rgba(225, 173, 15, 0.1)' : '#FEF9C3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 16,
        color: colors.icon,
        textAlign: 'center',
        marginBottom: 24,
    },
    startChatMainButton: {
        backgroundColor: colors.tint,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 24,
        shadowColor: colors.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    startChatMainButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    chatItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: isDark ? '#1E293B' : '#F1F5F9', // Slate-800 / Slate-100
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarText: {
        color: colors.tint,
        fontSize: 20,
        fontWeight: 'bold',
    },
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: colors.tint,
        borderWidth: 2,
        borderColor: colors.background,
    },
    chatItemContent: {
        flex: 1,
        justifyContent: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(148, 163, 184, 0.1)', // Very subtle border
        paddingBottom: 12,
    },
    chatItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
        alignItems: 'center',
    },
    chatItemName: {
        fontSize: 17,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    chatItemNameUnread: {
        fontWeight: '800',
    },
    chatItemTime: {
        fontSize: 12,
        color: colors.icon,
        marginLeft: 8,
    },
    chatItemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatItemMessage: {
        fontSize: 15,
        color: colors.icon,
        flex: 1,
        marginRight: 8,
        lineHeight: 20,
    },
    chatItemMessageTextUnread: {
        color: colors.text,
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: colors.tint,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        paddingHorizontal: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    closeModalButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 16,
        backgroundColor: colors.card,
        borderRadius: 12,
        height: 48,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        height: '100%',
    },
    adminList: {
        flex: 1,
    },
    noResultsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    noResultsText: {
        fontSize: 16,
        color: colors.icon,
        marginTop: 16,
    },
    adminItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatarSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarTextSmall: {
        color: colors.tint,
        fontSize: 16,
        fontWeight: 'bold',
    },
    adminInfo: {
        flex: 1,
        marginLeft: 16,
    },
    adminName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    adminRole: {
        fontSize: 13,
        color: colors.icon,
        marginTop: 2,
    },

    // Chat Conversation Styles
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
        backgroundColor: colors.tint, // Brand Gold
        borderBottomRightRadius: 4,
    },
    messageBubbleOther: {
        backgroundColor: isDark ? '#1E293B' : '#F1F5F9', // Slate
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    messageTimeOwn: {
        color: 'rgba(15, 23, 42, 0.7)',
    },
    messageTextOwn: {
        color: '#0F172A', // Dark text for contrast on Gold
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
