import admin from 'firebase-admin';
import { db } from '../db.js';
import { deviceTokens, pushNotifications, users } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { translateText } from './translateService.js';

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return true;
  
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    console.log('⚠️ Firebase not configured - FIREBASE_SERVICE_ACCOUNT_JSON not set');
    return false;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('✅ Firebase Admin initialized for push notifications');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    return false;
  }
}

export async function registerDeviceToken(userId, token, platform, deviceInfo = {}) {
  try {
    // ⚠️ Validar formato do token
    // FCM tokens começam com letras/números e contêm ":"
    // APNs tokens são hex strings de 64 caracteres (INVÁLIDOS para Firebase!)
    const isLikelyApnsToken = platform === 'ios' && /^[A-Fa-f0-9]{64}$/.test(token);
    const isLikelyFcmToken = token.includes(':') || token.length > 100;
    
    if (isLikelyApnsToken) {
      console.warn('⚠️ iOS token parece ser APNs (hex), não FCM. Notificações podem falhar!');
      console.warn('   Token:', token.substring(0, 20) + '...');
      console.warn('   Use @capacitor-community/fcm para obter FCM token no iOS');
    } else if (isLikelyFcmToken) {
      console.log('✅ Token parece ser FCM válido');
    }
    
    const existingTokens = await db.select()
      .from(deviceTokens)
      .where(and(
        eq(deviceTokens.userId, userId),
        eq(deviceTokens.token, token)
      ));

    if (existingTokens.length > 0) {
      await db.update(deviceTokens)
        .set({
          isActive: true,
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deviceTokens.id, existingTokens[0].id));
      
      console.log('✅ Device token updated for user:', userId);
      return existingTokens[0].id;
    }

    const id = uuidv4();
    await db.insert(deviceTokens).values({
      id,
      userId,
      token,
      platform,
      deviceInfo,
      isActive: true,
      lastUsedAt: new Date(),
    });

    console.log('✅ Device token registered for user:', userId);
    return id;
  } catch (error) {
    console.error('❌ Error registering device token:', error);
    throw error;
  }
}

export async function unregisterDeviceToken(userId, token) {
  try {
    await db.update(deviceTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(deviceTokens.userId, userId),
        eq(deviceTokens.token, token)
      ));
    
    console.log('✅ Device token unregistered for user:', userId);
  } catch (error) {
    console.error('❌ Error unregistering device token:', error);
    throw error;
  }
}

export async function getUserTokens(userId) {
  try {
    const tokens = await db.select()
      .from(deviceTokens)
      .where(and(
        eq(deviceTokens.userId, userId),
        eq(deviceTokens.isActive, true)
      ));
    
    return tokens;
  } catch (error) {
    console.error('❌ Error getting user tokens:', error);
    return [];
  }
}

export async function sendPushNotification(userId, title, body, data = {}, type = 'general') {
  if (!initializeFirebase()) {
    console.log('⚠️ Push notifications disabled - Firebase not configured');
    return { success: false, reason: 'firebase_not_configured' };
  }

  try {
    const tokens = await getUserTokens(userId);
    
    if (tokens.length === 0) {
      console.log('⚠️ No active tokens for user:', userId);
      return { success: false, reason: 'no_tokens' };
    }

    const notificationId = uuidv4();
    await db.insert(pushNotifications).values({
      id: notificationId,
      userId,
      title,
      body,
      data,
      type,
      status: 'sending',
    });

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        notificationId,
        type,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      tokens: tokens.map(t => t.token),
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    const successCount = response.successCount;
    const failureCount = response.failureCount;
    
    response.responses.forEach(async (resp, idx) => {
      if (!resp.success) {
        console.error(`❌ Failed to send to token ${idx}:`, resp.error);
        if (resp.error?.code === 'messaging/invalid-registration-token' ||
            resp.error?.code === 'messaging/registration-token-not-registered') {
          await db.update(deviceTokens)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(deviceTokens.token, tokens[idx].token));
        }
      }
    });

    await db.update(pushNotifications)
      .set({
        status: successCount > 0 ? 'sent' : 'failed',
        sentAt: new Date(),
      })
      .where(eq(pushNotifications.id, notificationId));

    console.log(`📬 Push notification sent: ${successCount} success, ${failureCount} failed`);
    
    return {
      success: successCount > 0,
      successCount,
      failureCount,
      notificationId,
    };
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return { success: false, reason: 'error', error: error.message };
  }
}

async function getUserLanguage(userId) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.preferredLanguage || 'pt';
  } catch (error) {
    console.error('Error getting user language:', error);
    return 'pt';
  }
}

export async function sendQueueNotification(userId, queueName, ticketNumber, position, businessName) {
  const userLang = await getUserLanguage(userId);
  
  let title = 'A sua vez está a chegar!';
  let body = `Fila: ${queueName} - Senha #${ticketNumber}. Faltam ${position} senhas para ser chamado.`;
  
  if (userLang !== 'pt') {
    title = await translateText(title, userLang, 'pt');
    body = await translateText(body, userLang, 'pt');
  }
  
  return sendPushNotification(userId, title, body, {
    queueName,
    ticketNumber: String(ticketNumber),
    position: String(position),
    businessName,
  }, 'queue_alert');
}

export async function sendTicketCalledNotification(userId, queueName, ticketNumber, businessName, toleranceMinutes = 15) {
  const userLang = await getUserLanguage(userId);
  
  let title = 'A sua senha foi chamada!';
  let body = `Senha #${ticketNumber} - ${queueName}. Dirija-se ao atendimento. Tem ${toleranceMinutes} minutos de tolerância.`;
  
  if (userLang !== 'pt') {
    title = await translateText(title, userLang, 'pt');
    body = await translateText(body, userLang, 'pt');
  }
  
  return sendPushNotification(userId, title, body, {
    queueName,
    ticketNumber: String(ticketNumber),
    businessName,
    toleranceMinutes: String(toleranceMinutes),
  }, 'ticket_called');
}

export async function sendAppointmentReminderNotification(userId, serviceName, businessName, date, time) {
  const userLang = await getUserLanguage(userId);
  
  let title = 'Lembrete de Marcação';
  let body = `A sua marcação para ${serviceName} em ${businessName} é amanhã às ${time}.`;
  
  if (userLang !== 'pt') {
    title = await translateText(title, userLang, 'pt');
    body = await translateText(body, userLang, 'pt');
  }
  
  return sendPushNotification(userId, title, body, {
    serviceName,
    businessName,
    date,
    time,
  }, 'appointment_reminder');
}

export async function sendAppointmentConfirmationNotification(userId, serviceName, businessName, date, time) {
  const userLang = await getUserLanguage(userId);
  
  let title = 'Marcação Confirmada';
  let body = `A sua marcação para ${serviceName} em ${businessName} foi confirmada para ${date} às ${time}.`;
  
  if (userLang !== 'pt') {
    title = await translateText(title, userLang, 'pt');
    body = await translateText(body, userLang, 'pt');
  }
  
  return sendPushNotification(userId, title, body, {
    serviceName,
    businessName,
    date,
    time,
  }, 'appointment_confirmed');
}

export default {
  registerDeviceToken,
  unregisterDeviceToken,
  getUserTokens,
  sendPushNotification,
  sendQueueNotification,
  sendTicketCalledNotification,
  sendAppointmentReminderNotification,
  sendAppointmentConfirmationNotification,
};
