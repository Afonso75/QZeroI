import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { pushNotificationService } from '@/services/pushNotificationService';
import { useUser } from '@/contexts/UserContext';
import { safeFetch } from '@/utils/apiConfig';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();
  const { user } = useUser();

  useEffect(() => {
    const supported = pushNotificationService.isSupported();
    setIsSupported(supported);
    
    if (supported && user) {
      initializePushNotifications();
    }
  }, [user]);

  const initializePushNotifications = useCallback(async () => {
    try {
      await pushNotificationService.init();
      const currentToken = pushNotificationService.getToken();
      setToken(currentToken);
      setIsEnabled(!!currentToken);

      const removeListener = pushNotificationService.addListener((event, data) => {
        if (event === 'received') {
          handleNotificationReceived(data);
        } else if (event === 'actionPerformed') {
          handleNotificationAction(data);
        }
      });

      return removeListener;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }, []);

  const handleNotificationReceived = useCallback((notification) => {
    const { title, body, data } = notification;
    
    toast.info(title, {
      description: body,
      action: data?.type ? {
        label: 'Ver',
        onClick: () => navigateToNotification(data),
      } : undefined,
    });
  }, []);

  const handleNotificationAction = useCallback((notification) => {
    const { data } = notification.notification;
    navigateToNotification(data);
  }, [navigate]);

  const navigateToNotification = useCallback((data) => {
    if (!data) return;
    
    switch (data.type) {
      case 'queue_alert':
      case 'ticket_called':
        navigate('/my-tickets');
        break;
      case 'appointment_reminder':
      case 'appointment_confirmed':
        navigate('/my-appointments');
        break;
      default:
        break;
    }
  }, [navigate]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Notificações push não são suportadas neste dispositivo');
      return false;
    }

    try {
      await pushNotificationService.init();
      const currentToken = pushNotificationService.getToken();
      setToken(currentToken);
      setIsEnabled(!!currentToken);
      
      if (currentToken) {
        toast.success('Notificações push ativadas com sucesso!');
      }
      
      return !!currentToken;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      toast.error('Erro ao ativar notificações push');
      return false;
    }
  }, [isSupported]);

  const sendTestNotification = useCallback(async () => {
    try {
      const { response, data } = await safeFetch('/api/push-notifications/test', {
        method: 'POST',
      });
      
      if (data?.success) {
        toast.success('Notificação de teste enviada!');
      } else {
        toast.error(data?.reason === 'firebase_not_configured' 
          ? 'Firebase não configurado no servidor'
          : 'Erro ao enviar notificação de teste');
      }
      
      return data;
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Erro ao enviar notificação de teste');
      return { success: false, error: error.message };
    }
  }, []);

  return {
    isSupported,
    isEnabled,
    token,
    requestPermission,
    sendTestNotification,
  };
}

export default usePushNotifications;
