import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LogOut, Trash2, AlertTriangle } from "lucide-react";
import { createPageUrl } from "@/utils";
import ProfileManager from "../components/portal/ProfileManager";
import { TranslatedText } from "@/components/translation/TranslatedText";
import { useAutoTranslate } from "@/hooks/useTranslate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const txtLogout = useAutoTranslate('Terminar Sessão', 'pt');
  const txtDeleteAccount = useAutoTranslate('Eliminar Conta', 'pt');
  const txtDeleteTitle = useAutoTranslate('Eliminar conta permanentemente?', 'pt');
  const txtDeleteDescription = useAutoTranslate('Esta ação é irreversível. Todos os seus dados, incluindo perfil, marcações, senhas e histórico serão eliminados permanentemente.', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtConfirmDelete = useAutoTranslate('Sim, eliminar conta', 'pt');
  const txtDeleting = useAutoTranslate('A eliminar...', 'pt');
  const txtDeleteError = useAutoTranslate('Erro ao eliminar conta. Tente novamente.', 'pt');
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  });

  const handleUpdate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['current-user'] });
    await queryClient.refetchQueries({ queryKey: ['current-user'] });
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      queryClient.clear();
      navigate(createPageUrl('Login'));
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await base44.auth.deleteAccount();
      queryClient.clear();
    } catch (error) {
      console.error('Erro ao eliminar conta:', error);
      toast.error(txtDeleteError);
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 p-3 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 md:h-16 w-48 md:w-64 mb-4 md:mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50">
      <div className="max-w-4xl lg:max-w-5xl mx-auto px-3 md:px-6 lg:px-8 py-4 md:py-8 lg:py-10 pb-6 md:pb-8">
        <div className="mb-4 md:mb-8 lg:mb-10">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-1 md:mb-2 lg:mb-3">
            <TranslatedText text="Meu Perfil" sourceLang="pt" />
          </h1>
          <p className="text-sm md:text-xl lg:text-2xl text-slate-600">
            <TranslatedText text="Gerir as suas informações pessoais" sourceLang="pt" />
          </p>
        </div>

        <ProfileManager user={user} onUpdate={handleUpdate} />

        <div className="mt-6 md:mt-8 lg:mt-10 pt-6 lg:pt-8 border-t border-slate-200 space-y-3 lg:space-y-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full md:w-auto lg:h-12 lg:text-base lg:px-6 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
          >
            <LogOut className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            {txtLogout}
          </Button>
          
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="ghost"
            className="w-full md:w-auto lg:h-12 lg:text-base lg:px-6 text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
            {txtDeleteAccount}
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <AlertDialogTitle className="text-red-600">
                {txtDeleteTitle}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600 pt-2">
              {txtDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting}>
              {txtCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? txtDeleting : txtConfirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}