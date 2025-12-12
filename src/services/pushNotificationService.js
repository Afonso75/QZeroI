import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { CapacitorHttp } from '@capacitor/core';

// ✅ URL base para Capacitor (deve apontar para servidor de produção)
const PRODUCTION_API_URL = 'https://q-zero-afonsomarques80.replit.app';

// ✅ Chave do token de autenticação (mesma usada em base44Client.js)
const AUTH_TOKEN_KEY = 'qzero_auth_token';

// ✅ Função para obter token de autenticação
const getAuthToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (e) {
    return null;
  }
};

// ✅ Função para obter URL completa da API
const getApiUrl = (endpoint) => {
  if (Capacitor.isNativePlatform()) {
    return `${PRODUCTION_API_URL}${endpoint}`;
  }
  return endpoint; // Web usa same-origin
};

// ✅ Função de fetch que usa CapacitorHttp no nativo para evitar problemas de CORS
const nativeFetch = async (url, options = {}) => {
  const fullUrl = getApiUrl(url);
  const authToken = getAuthToken();
  
  // Adicionar header de autenticação se existir token
  const authHeaders = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
  
  console.log('📡 nativeFetch:', { url, fullUrl, isNative: Capacitor.isNativePlatform(), hasAuth: !!authToken });
  
  if (Capacitor.isNativePlatform()) {
    try {
      const response = await CapacitorHttp.request({
        url: fullUrl,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers
        },
        data: options.body ? JSON.parse(options.body) : undefined,
        webFetchExtra: {
          credentials: 'include'
        }
      });
      console.log('✅ CapacitorHttp response:', response.status);
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: async () => response.data,
        text: async () => JSON.stringify(response.data)
      };
    } catch (error) {
      console.error('❌ CapacitorHttp error:', error);
      throw error;
    }
  }
  
  // Web: usar fetch normal
  return fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers
    }
  });
};

class PushNotificationService {
  constructor() {
    this.initialized = false;
    this.token = null;
    this.fcmToken = null;
    this.listeners = [];
    
    // iOS: Listen for FCM token from native AppDelegate
    if (typeof window !== 'undefined') {
      window.addEventListener('fcmToken', async (event) => {
        const fcmToken = event.detail;
        console.log('🔥 iOS FCM token received from native:', fcmToken);
        this.fcmToken = fcmToken;
        this.token = fcmToken;
        await this.saveTokenToServer(fcmToken);
      });
    }
  }

  async init() {
    if (this.initialized) return;
    
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Push notifications only available on native platforms');
      return;
    }

    try {
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const newStatus = await PushNotifications.requestPermissions();
        if (newStatus.receive !== 'granted') {
          console.log('❌ Push notification permission denied');
          return;
        }
      } else if (permStatus.receive !== 'granted') {
        console.log('❌ Push notification permission not granted');
        return;
      }

      await PushNotifications.register();
      this.setupListeners();
      this.initialized = true;
      console.log('✅ Push notifications initialized');
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
    }
  }

  setupListeners() {
    PushNotifications.addListener('registration', async (token) => {
      console.log('📱 Push registration token:', token.value);
      
      // Android: o token já é o FCM token
      // iOS: O AppDelegate.swift passa o APNs token para o Firebase que gera o FCM token
      // O FCM token é enviado via MessagingDelegate e guardado em UserDefaults
      // Por agora, usamos o token recebido (Android funciona, iOS precisa do FCM setup nativo)
      this.token = token.value;
      await this.saveTokenToServer(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📬 Push notification received:', notification);
      this.notifyListeners('received', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('👆 Push notification action performed:', notification);
      this.notifyListeners('actionPerformed', notification);
    });
  }

  async saveTokenToServer(token) {
    try {
      const platform = Capacitor.getPlatform();
      console.log('📱 Saving push token to server...');
      
      const response = await nativeFetch('/api/push-notifications/register-token', {
        method: 'POST',
        body: JSON.stringify({
          token,
          platform,
          deviceInfo: {
            platform,
            isNative: Capacitor.isNativePlatform(),
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to save push token:', response.status, errorText);
        throw new Error('Failed to save push token');
      }

      console.log('✅ Push token saved to server');
    } catch (error) {
      console.error('❌ Error saving push token:', error);
    }
  }

  async removeTokenFromServer() {
    if (!this.token) return;

    try {
      await nativeFetch('/api/push-notifications/unregister-token', {
        method: 'POST',
        body: JSON.stringify({ token: this.token }),
      });
      console.log('✅ Push token removed from server');
    } catch (error) {
      console.error('❌ Error removing push token:', error);
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in push notification listener:', error);
      }
    });
  }

  getToken() {
    return this.token;
  }

  isSupported() {
    return Capacitor.isNativePlatform();
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
