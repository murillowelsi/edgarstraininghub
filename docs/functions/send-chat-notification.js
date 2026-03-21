/**
 * Firebase Cloud Function: sendChatNotification
 *
 * Triggers when a new message is created in Firestore.
 * Sends a push notification via FCM to the recipient's registered devices.
 *
 * SETUP:
 * 1. Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
 *    → Generate Key Pair → copy to VITE_FIREBASE_VAPID_KEY in .env
 *
 * 2. Install Firebase CLI:
 *    npm install -g firebase-tools
 *
 * 3. Initialise functions in the project root:
 *    firebase init functions
 *    (select JavaScript, don't overwrite existing files)
 *
 * 4. Copy this file to functions/index.js
 *
 * 5. Deploy:
 *    firebase deploy --only functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

exports.sendChatNotification = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { chatId } = context.params;

    // Get the chat to find the recipient
    const chatSnap = await db.collection("chats").doc(chatId).get();
    if (!chatSnap.exists) return null;

    const chat = chatSnap.data();
    const senderId = message.senderId;
    const recipientId = chat.participantIds.find((id) => id !== senderId);

    if (!recipientId) return null;

    // Get the sender's display name
    const senderSnap = await db.collection("users").doc(senderId).get();
    const senderName = senderSnap.exists ? senderSnap.data().displayName : "Someone";

    // Get the recipient's FCM tokens
    const tokensSnap = await db
      .collection("users")
      .doc(recipientId)
      .collection("fcmTokens")
      .get();

    if (tokensSnap.empty) return null;

    // Count recipient's unread messages across all chats
    const recipientChatsSnap = await db
      .collection("chats")
      .where("participantIds", "array-contains", recipientId)
      .get();

    let totalUnread = 0;
    recipientChatsSnap.forEach((doc) => {
      const chatData = doc.data();
      totalUnread += chatData.unreadCount?.[recipientId] || 0;
    });

    // Determine the URL to open when the notification is tapped
    // Check if the recipient is an admin or an athlete
    const recipientSnap = await db.collection("users").doc(recipientId).get();
    const recipientRole = recipientSnap.exists ? recipientSnap.data().role : "athlete";
    const chatUrl = recipientRole === "admin" ? "/admin/chat" : "/athlete/chat";

    // Send to all registered tokens
    const tokens = tokensSnap.docs.map((doc) => doc.data().token);
    const invalidTokens = [];

    const results = await Promise.allSettled(
      tokens.map((token) =>
        messaging.send({
          token,
          notification: {
            title: senderName,
            body:
              message.text.length > 80
                ? message.text.substring(0, 80) + "…"
                : message.text,
          },
          data: {
            url: chatUrl,
            title: senderName,
            body: message.text,
            unreadCount: String(Math.max(totalUnread, 1)),
          },
          webpush: {
            notification: {
              icon: "/pwa-192x192.png",
              badge: "/pwa-192x192.png",
              vibrate: [200, 100, 200],
              tag: chatUrl,
              renotify: "true",
            },
            fcmOptions: { link: chatUrl },
          },
          apns: {
            payload: {
              aps: {
                badge: Math.max(totalUnread, 1),
                sound: "default",
              },
            },
          },
        })
      )
    );

    // Clean up invalid tokens
    results.forEach((result, i) => {
      if (
        result.status === "rejected" &&
        (result.reason?.code === "messaging/invalid-registration-token" ||
          result.reason?.code === "messaging/registration-token-not-registered")
      ) {
        invalidTokens.push(tokens[i]);
      }
    });

    if (invalidTokens.length > 0) {
      const batch = db.batch();
      invalidTokens.forEach((token) => {
        const ref = db
          .collection("users")
          .doc(recipientId)
          .collection("fcmTokens")
          .doc(token);
        batch.delete(ref);
      });
      await batch.commit();
    }

    return null;
  });
