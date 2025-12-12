/**
 * Consent Retry System
 * Automatically retries pending consent submissions that failed on initial attempt
 */

/**
 * Attempt to send pending consent to server
 * Called on app load
 */
export async function retryPendingConsent() {
  try {
    // Check if there's a pending consent
    const pendingConsentData = localStorage.getItem('qzero_consent_pending');
    
    if (!pendingConsentData) {
      return; // No pending consent
    }

    console.log('🔄 Attempting to retry pending consent...');
    
    const consentPayload = JSON.parse(pendingConsentData);

    // Attempt to send consent to backend
    const { safeFetch } = await import('@/utils/apiConfig');
    const { response, data: result } = await safeFetch('/api/consent', {
      method: 'POST',
      body: JSON.stringify(consentPayload)
    });

    if (response.ok) {
      if (result?.ok) {
        // Success - remove pending consent
        localStorage.removeItem('qzero_consent_pending');
        console.log('✅ Pending consent successfully submitted');
      } else {
        console.warn('⚠️ Consent API returned ok:false, will retry later');
      }
    } else {
      console.warn(`⚠️ Consent retry failed with HTTP ${response.status}, will retry later`);
    }
  } catch (error) {
    console.warn('⚠️ Consent retry failed:', error.message, '- will retry later');
  }
}
