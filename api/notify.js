/**
 * Vercel Serverless Function: POST /api/notify
 *
 * Called by the client immediately after a chat message is saved to Firestore.
 * Looks up the recipient's FCM tokens and sends a push notification via Firebase Admin SDK.
 *
 * Environment variables required in Vercel dashboard:
 *   FIREBASE_PROJECT_ID       — from Firebase Console > Project Settings > General
 *   FIREBASE_CLIENT_EMAIL     — from the service account JSON
 *   FIREBASE_PRIVATE_KEY      — from the service account JSON (include -----BEGIN...-----END-----)
 *
 * How to get the service account:
 *   Firebase Console > Project Settings > Service accounts > Generate new private key
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

// Initialise once (Vercel reuses the process between warm invocations)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const messaging = getMessaging();
const adminAuth = getAuth();

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chatId, messageText, recipientId, idToken } = req.body || {};

  if (
    typeof chatId !== 'string' || !chatId ||
    typeof messageText !== 'string' || !messageText ||
    typeof recipientId !== 'string' || !recipientId ||
    typeof idToken !== 'string' || !idToken ||
    chatId.includes('/') || recipientId.includes('/')
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let senderId;
  try {
    // Verify the sender is authenticated (idToken from Firebase Auth)
    senderId = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' });
  }

  try {
    // Only participants of this chat may notify another participant of it
    const chatSnap = await db.collection('chats').doc(chatId).get();
    const participantIds = chatSnap.exists ? chatSnap.data().participantIds || [] : [];
    if (
      recipientId === senderId ||
      !participantIds.includes(senderId) ||
      !participantIds.includes(recipientId)
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Sender name comes from the server (public profile), never from the client,
    // and an e-mail address is never shown on a lock screen
    let senderName;
    const profileSnap = await db.collection('publicProfiles').doc(senderId).get();
    let rawName = profileSnap.exists ? profileSnap.data().displayName : undefined;
    let senderRole = profileSnap.exists ? profileSnap.data().role : undefined;
    if (!rawName || !senderRole) {
      const senderSnap = await db.collection('users').doc(senderId).get();
      if (senderSnap.exists) {
        rawName = rawName || senderSnap.data().displayName;
        senderRole = senderRole || senderSnap.data().role;
      }
    }
    if (rawName && !rawName.includes('@')) senderName = rawName;
    else if (senderRole === 'admin') senderName = 'Coach';

    // Get recipient's FCM tokens
    const tokensSnap = await db
      .collection('users')
      .doc(recipientId)
      .collection('fcmTokens')
      .get();

    if (tokensSnap.empty) {
      return res.status(200).json({ sent: 0, reason: 'No tokens registered' });
    }

    // Determine the URL to open (admin or athlete page)
    const recipientSnap = await db.collection('users').doc(recipientId).get();
    const role = recipientSnap.exists ? recipientSnap.data().role : 'athlete';
    const chatUrl = role === 'admin' ? '/admin/chat' : '/athlete/chat';

    // Count recipient's total unread messages for the badge
    const chatsSnap = await db
      .collection('chats')
      .where('participantIds', 'array-contains', recipientId)
      .get();

    let totalUnread = 0;
    chatsSnap.forEach((doc) => {
      const data = doc.data();
      totalUnread += data.unreadCount?.[recipientId] || 0;
    });

    // Same token twice (legacy docs) would push twice: send once per distinct token
    const tokens = [...new Set(tokensSnap.docs.map((d) => d.data().token).filter(Boolean))];
    const staleTokens = [];
    let sentCount = 0;

    // Send to all registered tokens
    await Promise.all(
      tokens.map(async (token) => {
        try {
          await messaging.send({
            token,
            notification: {
              title: senderName || 'Nova mensagem',
              body: messageText.length > 100 ? messageText.slice(0, 100) + '…' : messageText,
            },
            data: {
              url: chatUrl,
              title: senderName || 'Nova mensagem',
              body: messageText,
              unreadCount: String(Math.max(totalUnread, 1)),
            },
            webpush: {
              notification: {
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                vibrate: [200, 100, 200],
                tag: chatUrl,
                renotify: 'true',
              },
              fcmOptions: { link: chatUrl },
            },
            apns: {
              payload: {
                aps: {
                  badge: Math.max(totalUnread, 1),
                  sound: 'default',
                },
              },
            },
          });
          sentCount++;
        } catch (err) {
          // Mark stale tokens for cleanup
          if (
            err.code === 'messaging/invalid-registration-token' ||
            err.code === 'messaging/registration-token-not-registered'
          ) {
            staleTokens.push(token);
          }
        }
      })
    );

    // Clean up stale tokens
    if (staleTokens.length > 0) {
      const batch = db.batch();
      staleTokens.forEach((token) => {
        batch.delete(
          db.collection('users').doc(recipientId).collection('fcmTokens').doc(token)
        );
      });
      await batch.commit();
    }

    // Diagnostics only: counts, no tokens or personal data
    console.log(JSON.stringify({ fn: 'notify', tokenDocs: tokensSnap.size, distinctTokens: tokens.length, sent: sentCount, stale: staleTokens.length }));
    return res.status(200).json({ sent: sentCount });
  } catch (err) {
    console.error('notify error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
