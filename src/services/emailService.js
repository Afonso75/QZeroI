export async function sendEmail({ to, subject, body }) {
  try {
    const { safeFetch } = await import('@/utils/apiConfig');
    const { response, data: result } = await safeFetch('/api/send-ticket-email', {
      method: 'POST',
      body: JSON.stringify({ to, subject, body }),
    });
    
    if (result?.success) {
      console.log('✅ Email enviado via Resend:', result);
      return { success: true, id: result?.id };
    } else {
      console.error('❌ Erro ao enviar email:', result?.error);
      return { success: false, error: result?.error };
    }
  } catch (error) {
    console.error('❌ Erro ao enviar email via Resend:', error);
    return { success: false, error: error.message };
  }
}
