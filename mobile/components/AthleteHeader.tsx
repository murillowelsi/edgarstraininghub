import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Moon, Sun, LogOut } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';

export default function AthleteHeader() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { colorScheme, toggleTheme } = useTheme();
    const [menuVisible, setMenuVisible] = useState(false);

    const isDark = colorScheme === 'dark';
    const colors = Colors[colorScheme];

    const getInitials = (email: string | null | undefined) => {
        if (!email) return 'A';
        return email.charAt(0).toUpperCase();
    };

    const handleLogout = async () => {
        setMenuVisible(false);
        // TODO: Implement logout
        router.replace('/');
    };

    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: insets.top + 8,
                    backgroundColor: isDark ? 'rgba(9, 9, 11, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                    borderBottomColor: isDark ? 'rgba(39, 39, 42, 0.5)' : 'rgba(228, 228, 231, 0.5)',
                },
            ]}
        >
            <View style={styles.headerContent}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoText}>EZ</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {/* Theme Toggle */}
                    <TouchableOpacity
                        onPress={toggleTheme}
                        style={styles.iconButton}
                        activeOpacity={0.7}
                    >
                        {isDark ? (
                            <Sun size={18} color={colors.icon} />
                        ) : (
                            <Moon size={18} color={colors.icon} />
                        )}
                    </TouchableOpacity>

                    {/* Avatar with Dropdown */}
                    <TouchableOpacity
                        onPress={() => setMenuVisible(true)}
                        style={styles.avatarButton}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{getInitials(user?.email)}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Dropdown Menu Modal */}
            <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setMenuVisible(false)}
                >
                    <View style={[
                        styles.dropdown,
                        {
                            top: insets.top + 60,
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                        }
                    ]}>
                        <View style={styles.dropdownHeader}>
                            <Text style={[styles.dropdownEmail, { color: colors.text }]} numberOfLines={1}>
                                {user?.email}
                            </Text>
                            <Text style={[styles.dropdownRole, { color: colors.icon }]}>Athlete</Text>
                        </View>
                        <View style={[styles.dropdownDivider, { backgroundColor: colors.border }]} />
                        <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={handleLogout}
                            activeOpacity={0.7}
                        >
                            <LogOut size={16} color={colors.destructive} />
                            <Text style={[styles.dropdownItemTextDanger, { color: colors.destructive }]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(228, 228, 231, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoText: {
        fontSize: 30,
        fontWeight: '800',
        color: '#E6B800', // Primary yellow/gold color from web
        letterSpacing: -1,
    },
    brandText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#09090B',
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarButton: {
        padding: 4,
        borderRadius: 20,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E6B800', // Primary color
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#09090B', // primary-foreground
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    dropdown: {
        position: 'absolute',
        right: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E4E4E7',
        minWidth: 192,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    dropdownHeader: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    dropdownEmail: {
        fontSize: 14,
        fontWeight: '500',
        color: '#09090B',
    },
    dropdownRole: {
        fontSize: 12,
        color: '#71717A',
        marginTop: 2,
    },
    dropdownDivider: {
        height: 1,
        backgroundColor: '#E4E4E7',
        marginVertical: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    dropdownItemTextDanger: {
        fontSize: 14,
        color: '#EF4444',
        fontWeight: '500',
    },
});
