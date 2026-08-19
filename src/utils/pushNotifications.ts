import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase'; // Adjust this import path if needed
import { Capacitor } from '@capacitor/core';

export const setupPushNotifications = async (userId: string) => {
  // Push notifications only work on actual Android/iOS devices, not in the web browser
  if (!Capacitor.isNativePlatform()) {
    console.log("Push notifications are not supported on the web.");
    return;
  }

  try {
    // 1. Request permission from the user
    let permStatus = await PushNotifications.checkPermissions();
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('User denied push notification permissions');
      return;
    }

    // 2. Register the device with Google FCM
    await PushNotifications.register();

    // 3. Listen for the token and save it to Firestore
    PushNotifications.addListener('registration', async (token) => {
      console.log('✅ FCM Token generated: ', token.value);
      
      try {
        const userRef = doc(db, 'users', userId);
        // Overwrite the empty string with the real device token
        await updateDoc(userRef, {
          fcmToken: token.value
        });
        console.log('✅ Token successfully saved to Firestore!');
      } catch (error) {
        console.error('❌ Error saving token to Firestore', error);
      }
    });

    // Handle any errors during registration
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ Error on registration: ' + JSON.stringify(error));
    });

  } catch (error) {
    console.error("❌ Failed to setup push notifications:", error);
  }
};