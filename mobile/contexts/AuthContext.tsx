import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase'; // Ensure this points to correct mobile firebase file

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    isAthlete: boolean;
    userRole: string | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    isAthlete: false,
    userRole: null,
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                setUser(currentUser);
                // Fetch user role from Firestore
                try {
                    const docRef = doc(db, 'users', currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserRole(data.role);
                    } else {
                        console.warn('User document not found in Firestore');
                        setUserRole(null);
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    setUserRole(null);
                }
            } else {
                setUser(null);
                setUserRole(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        user,
        loading,
        isAdmin: userRole === 'admin',
        isAthlete: userRole === 'athlete',
        userRole,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
