import React, { useEffect, useState } from 'react';
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

// Mock types
interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: { seconds: number };
}

interface Chat {
    id: string;
    participantIds: string[];
    lastMessage: string;
    lastMessageTime: { seconds: number };
    unreadCount?: Record<string, number>;
}

interface User {
    id: string;
    displayName: string;
    email: string;
    role: string;
}

export default function AthleteChat() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [admins, setAdmins] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const currentUserId = 'user-123'; // TODO: Get from auth context

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // TODO: Replace with actual API calls
            // Load chats and admins
            setChats([]);
            setAdmins([]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedChat) return;

        try {
            // TODO: Send message via API
            // await ChatService.sendMessage(selectedChat.id, currentUserId, messageText);
            setMessageText('');
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleStartChat = async (admin: User) => {
        try {
            // TODO: Create or get chat
            // const chat = await ChatService.createOrGetChat(currentUserId, 'Athlete', admin.id);
            // setSelectedChat(chat);
            setIsNewChatOpen(false);
        } catch (error) {
            console.error('Error starting chat:', error);
        }
    };

    const getChatDisplayName = (chat: Chat) => {
        // Find the other participant
        const otherId = chat.participantIds.find((id) => id !== currentUserId);
        return 'Coach'; // TODO: Get actual name from admin map
    };

    const filteredAdmins = admins.filter(
        (a) =>
            a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
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
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Chat</Text>
                    <TouchableOpacity onPress={() => setIsNewChatOpen(true)}>
                        <Ionicons name="add-circle-outline" size={28} color="#3B82F6" />
                    </TouchableOpacity>
                </View>

                {/* Chat List */}
                <ScrollView style={styles.chatList}>
                    {chats.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#9CA3AF" />
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
                            const unreadCount = chat.unreadCount?.[currentUserId] || 0;

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
                                            {chat.lastMessageTime && (
                                                <Text style={styles.chatItemTime}>
                                                    {formatDistanceToNow(
                                                        new Date(chat.lastMessageTime.seconds * 1000),
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
                                <Ionicons name="close" size={28} color="#111827" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>New Message</Text>
                            <View style={{ width: 28 }} />
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search coaches..."
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
                                            <Text style={styles.avatarText}>{admin.displayName[0]?.toUpperCase()}</Text>
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
                    <Ionicons name="arrow-back" size={24} color="#111827" />
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
                ref={(ref) => ref?.scrollToEnd({ animated: false })}
            >
                {messages.length === 0 ? (
                    <View style={styles.emptyMessagesState}>
                        <Text style={styles.emptyMessagesText}>No messages yet</Text>
                        <Text style={styles.emptyMessagesSubtext}>Start the conversation!</Text>
                    </View>
                ) : (
                    messages.map((message) => {
                        const isOwnMessage = message.senderId === currentUserId;

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
                                    {formatDistanceToNow(new Date(message.createdAt.seconds * 1000), {
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
                        color={messageText.trim() ? '#FFFFFF' : '#9CA3AF'}
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    chatHeaderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chatHeaderName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    chatList: {
        flex: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
        marginBottom: 24,
    },
    startChatButton: {
        backgroundColor: '#3B82F6',
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
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3B82F6',
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
        color: '#111827',
    },
    chatItemNameUnread: {
        fontWeight: '700',
    },
    chatItemTime: {
        fontSize: 10,
        color: '#9CA3AF',
    },
    chatItemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chatItemMessage: {
        fontSize: 14,
        color: '#6B7280',
        flex: 1,
    },
    chatItemMessageUnread: {
        color: '#111827',
        fontWeight: '500',
    },
    unreadBadge: {
        backgroundColor: '#3B82F6',
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
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#111827',
    },
    adminList: {
        flex: 1,
    },
    noResultsText: {
        textAlign: 'center',
        padding: 32,
        fontSize: 14,
        color: '#6B7280',
    },
    adminItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    adminName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    adminRole: {
        fontSize: 12,
        color: '#6B7280',
        textTransform: 'capitalize',
    },
    messagesContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
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
        color: '#6B7280',
    },
    emptyMessagesSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
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
        backgroundColor: '#3B82F6',
        borderBottomRightRadius: 4,
    },
    messageBubbleOther: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        marginBottom: 4,
    },
    messageTextOwn: {
        color: '#FFFFFF',
    },
    messageTextOther: {
        color: '#111827',
    },
    messageTime: {
        fontSize: 10,
    },
    messageTimeOwn: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    messageTimeOther: {
        color: '#9CA3AF',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    messageInput: {
        flex: 1,
        maxHeight: 100,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        fontSize: 16,
        color: '#111827',
        marginRight: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
});
