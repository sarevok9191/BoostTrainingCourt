// Firebase Cloud Messaging Service Worker
// This file must be at the root of the domain (/firebase-messaging-sw.js)

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyDy3rNgQM1BKlq_72BHWL9X0D3iu8W0oDg",
  authDomain:        "boosttrainingcourt-29cb6.firebaseapp.com",
  projectId:         "boosttrainingcourt-29cb6",
  storageBucket:     "boosttrainingcourt-29cb6.firebasestorage.app",
  messagingSenderId: "481428464812",
  appId:             "1:481428464812:web:bfc23e06c50113342f2b09",
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Boost Training Court";
  const body  = payload.notification?.body  || "";

  self.registration.showNotification(title, {
    body,
    icon:  "/favicon.ico",
    badge: "/favicon.ico",
    data:  payload.data || {},
  });
});
