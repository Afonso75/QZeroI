import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export function useNavigateBack(fallbackPath = '/') {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath, { replace: true });
    }
  }, [navigate, fallbackPath]);

  return goBack;
}

export function navigateBackOrFallback(navigate, fallbackPath = '/') {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate(fallbackPath, { replace: true });
  }
}
