import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAutoTranslate } from '@/hooks/useTranslate';

export function useConfirm() {
  const txtDefaultCancel = useAutoTranslate('Cancelar', 'pt');
  const txtDefaultConfirm = useAutoTranslate('Confirmar', 'pt');
  
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    cancelText: '',
    variant: 'default',
  });
  
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, description, confirmText, cancelText, variant = 'default' }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        isOpen: true,
        title,
        description,
        confirmText: confirmText || txtDefaultConfirm,
        cancelText: cancelText || txtDefaultCancel,
        variant,
      });
    });
  }, [txtDefaultConfirm, txtDefaultCancel]);

  const handleConfirm = useCallback(() => {
    console.log('🔴 CONFIRM CLICKED');
    setState(prev => ({ ...prev, isOpen: false }));
    setTimeout(() => {
      if (resolveRef.current) {
        console.log('🔴 RESOLVING WITH TRUE');
        resolveRef.current(true);
        resolveRef.current = null;
      }
    }, 100);
  }, []);

  const handleCancel = useCallback(() => {
    console.log('🔴 CANCEL CLICKED');
    setState(prev => ({ ...prev, isOpen: false }));
    setTimeout(() => {
      if (resolveRef.current) {
        console.log('🔴 RESOLVING WITH FALSE');
        resolveRef.current(false);
        resolveRef.current = null;
      }
    }, 100);
  }, []);

  const ConfirmDialog = () => (
    <AlertDialog open={state.isOpen} onOpenChange={(open) => {
      if (!open && state.isOpen) {
        handleCancel();
      }
    }}>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base sm:text-lg">{state.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            {state.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline"
            onClick={handleCancel} 
            className="w-full sm:w-auto"
          >
            {state.cancelText || txtDefaultCancel}
          </Button>
          <Button 
            onClick={handleConfirm}
            className={`w-full sm:w-auto ${
              state.variant === 'destructive' 
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white' 
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white'
            }`}
          >
            {state.confirmText || txtDefaultConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
