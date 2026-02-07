import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { ChatService, type Chat, type User } from '@/services/chatService';

export default function AthleteChatList() {
    const { user } = useAuth();
    const { colorScheme } = useTheme();
    const colors = Colors[colorScheme];
    const isDark = colorScheme === 'dark';
    const styles = getStyles(colors, isDark);

    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [admins, setAdmins] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

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

    const loadAdmins = async () => {
        try {
            const coaches = await ChatService.getCoaches();
            setAdmins(coaches);
        } catch (error) {
            console.error('Error loading coaches:', error);
        }
    };

    const handleStartChat = async (admin: User) => {
        if (!currentUserId) return;

        try {
            const athleteName = user?.displayName || 'Athlete';
            const chatObj = await ChatService.createOrGetChat(currentUserId, athleteName, admin.id);

            setIsNewChatOpen(false);

            // Navigate to the chat
            router.push({
                pathname: '/(athlete)/chat/[id]',
                params: {
                    id: (chatObj as Chat).id,
                    name: admin.displayName
                }
            });
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
                                onPress={() => router.push({
                                    pathname: '/(athlete)/chat/[id]',
                                    params: {
                                        id: chat.id,
                                        name: displayName
                                    }
                                })}
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
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
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
        justifyContent: 'center',
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
        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
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
        borderBottomColor: 'rgba(148, 163, 184, 0.1)',
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
});
