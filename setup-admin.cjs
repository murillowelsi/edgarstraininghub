const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: 'edgarzanin-3953f'
});

const db = getFirestore();

async function setupAdmin() {
  try {
    await db.collection('users').doc('2RUiw60HgFXH761fbWvKUIaGM5f2').set({
      role: 'admin',
      createdAt: new Date()
    });
    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

setupAdmin();
