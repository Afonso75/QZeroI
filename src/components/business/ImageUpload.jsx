import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { getUploadUrl, safeFetch } from '@/utils/apiConfig';

export function ImageUpload({ 
  label, 
  value, 
  onChange, 
  required = false,
  helpText 
}) {
  const txtInvalidFileType = useAutoTranslate('Tipo de ficheiro inválido. Apenas PNG, JPG, JPEG e GIF são permitidos.', 'pt');
  const txtFileTooLarge = useAutoTranslate('Ficheiro demasiado grande. Tamanho máximo: 5MB', 'pt');
  const txtImageUploaded = useAutoTranslate('Imagem carregada com sucesso!', 'pt');
  const txtUploadError = useAutoTranslate('Erro ao carregar imagem', 'pt');
  const txtImageRemoved = useAutoTranslate('Imagem removida', 'pt');
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtReplace = useAutoTranslate('Substituir', 'pt');
  const txtRemove = useAutoTranslate('Remover', 'pt');
  const txtLoadingImage = useAutoTranslate('A carregar imagem...', 'pt');
  const txtClickToChoose = useAutoTranslate('Clique para escolher ficheiro', 'pt');
  const txtOrDragHere = useAutoTranslate('ou arraste aqui', 'pt');
  const txtMaxSize = useAutoTranslate('PNG, JPG, GIF (máx. 5MB)', 'pt');
  const txtPreview = useAutoTranslate('Pré-visualização', 'pt');
  const txtPermissionDenied = useAutoTranslate('Permissão para aceder à galeria negada', 'pt');
  const txtSelectionCancelled = useAutoTranslate('Seleção de imagem cancelada', 'pt');
  const txtImageNotAvailable = useAutoTranslate('A imagem anterior não está disponível. Por favor, faça upload de uma nova.', 'pt');

  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (value) {
      setPreview(getUploadUrl(value));
      setImageError(false);
    } else {
      setPreview(null);
      setImageError(false);
    }
  }, [value]);

  const handleImageError = () => {
    console.warn('⚠️ Erro ao carregar imagem:', preview);
    setImageError(true);
  };

  const handleCapacitorImagePick = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      if (!image.dataUrl) {
        toast.error(txtUploadError);
        return;
      }

      setPreview(image.dataUrl);
      setUploading(true);

      try {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        
        const mimeType = image.format === 'png' ? 'image/png' : 'image/jpeg';
        const extension = image.format === 'png' ? 'png' : 'jpg';
        const fileName = `image_${Date.now()}.${extension}`;
        
        const file = new File([blob], fileName, { type: mimeType });

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(txtFileTooLarge);
          setPreview(null);
          return;
        }

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        onChange(file_url);
        toast.success(txtImageUploaded);
      } catch (uploadError) {
        console.error('Erro no upload:', uploadError);
        toast.error(uploadError.message || txtUploadError);
        setPreview(null);
      } finally {
        setUploading(false);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      
      if (error.message?.includes('User cancelled') || error.message?.includes('canceled')) {
        return;
      }
      
      if (error.message?.includes('permission') || error.message?.includes('denied')) {
        toast.error(txtPermissionDenied);
      } else {
        toast.error(txtUploadError);
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(txtInvalidFileType);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(txtFileTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success(txtImageUploaded);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error.message || txtUploadError);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        await safeFetch('/api/delete-image', {
          method: 'DELETE',
          body: JSON.stringify({ fileUrl: value })
        });
      } catch (error) {
        console.error('Erro ao apagar imagem:', error);
      }
    }
    
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success(txtImageRemoved);
  };

  const handleButtonClick = () => {
    if (Capacitor.isNativePlatform()) {
      handleCapacitorImagePick();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      <Label className={required ? 'required' : ''}>
        {label}
      </Label>
      
      {helpText && (
        <p className="text-sm text-slate-500">{helpText}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {preview && !imageError ? (
        <div className="relative border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
          <img
            src={preview}
            alt={txtPreview}
            className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
            onError={handleImageError}
          />
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleButtonClick}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {txtLoading}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {txtReplace}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="w-4 h-4 mr-2" />
              {txtRemove}
            </Button>
          </div>
        </div>
      ) : preview && imageError ? (
        <div className="relative border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm text-orange-700 text-center">
              {txtImageNotAvailable}
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleButtonClick}
              disabled={uploading}
              className="flex-1 border-orange-400 text-orange-700 hover:bg-orange-100"
            >
              <Upload className="w-4 h-4 mr-2" />
              {txtReplace}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="w-4 h-4 mr-2" />
              {txtRemove}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-sm text-slate-600">{txtLoadingImage}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8 text-slate-400" />
              <div className="text-sm">
                <span className="font-semibold text-indigo-600">{txtClickToChoose}</span>
                <span className="text-slate-500"> {txtOrDragHere}</span>
              </div>
              <span className="text-xs text-slate-400">{txtMaxSize}</span>
            </div>
          )}
        </Button>
      )}
    </div>
  );
}
