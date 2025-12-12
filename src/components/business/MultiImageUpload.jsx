import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { getUploadUrl } from '@/utils/apiConfig';

export function MultiImageUpload({ 
  label = "Galeria de Fotos", 
  value = [], 
  onChange, 
  maxImages = 10,
  helpText = "Adicione fotos da sua empresa (ex: instalações, produtos, pratos)"
}) {
  const txtInvalidType = useAutoTranslate('Tipo inválido. Apenas PNG, JPG, JPEG e GIF.', 'pt');
  const txtFileTooLarge = useAutoTranslate('Ficheiro demasiado grande (máx 5MB)', 'pt');
  const txtMaxPhotosReached = useAutoTranslate('Máximo de fotos atingido', 'pt');
  const txtUploadedSuccess = useAutoTranslate('carregada com sucesso!', 'pt');
  const txtUploadError = useAutoTranslate('Erro ao carregar', 'pt');
  const txtPhotoRemoved = useAutoTranslate('Foto removida com sucesso!', 'pt');
  const txtPhotoRemovedWarning = useAutoTranslate('Foto removida da galeria (ficheiro pode permanecer no servidor)', 'pt');
  const txtPhoto = useAutoTranslate('Foto', 'pt');
  const txtRemovePhoto = useAutoTranslate('Remover foto', 'pt');
  const txtLoading = useAutoTranslate('A carregar...', 'pt');
  const txtAddPhotos = useAutoTranslate('Adicionar Fotos', 'pt');
  const txtAddMorePhotos = useAutoTranslate('Adicionar Mais Fotos', 'pt');
  const txtPhotoAdded = useAutoTranslate('foto adicionada', 'pt');
  const txtPhotosAdded = useAutoTranslate('fotos adicionadas', 'pt');

  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(value || []);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setImages(value || []);
  }, [value]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024;

    setUploading(true);
    
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: ${txtInvalidType}`);
        continue;
      }

      if (file.size > maxSize) {
        toast.error(`${file.name}: ${txtFileTooLarge}`);
        continue;
      }

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        setImages(prev => {
          if (prev.length >= maxImages) {
            toast.error(`${txtMaxPhotosReached} (${maxImages})`);
            return prev;
          }
          const updated = [...prev, file_url];
          onChange(updated);
          return updated;
        });
        
        toast.success(`${file.name} ${txtUploadedSuccess}`);
      } catch (error) {
        console.error('Erro no upload:', error);
        toast.error(`${txtUploadError} ${file.name}`);
      }
    }
    
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = async (indexToRemove) => {
    const imageUrl = images[indexToRemove];
    
    try {
      await base44.integrations.Core.DeleteFile({ fileUrl: imageUrl });
      
      setImages(prev => {
        const updated = prev.filter((_, index) => index !== indexToRemove);
        onChange(updated);
        return updated;
      });
      
      toast.success(txtPhotoRemoved);
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      
      setImages(prev => {
        const updated = prev.filter((_, index) => index !== indexToRemove);
        onChange(updated);
        return updated;
      });
      
      toast.warning(txtPhotoRemovedWarning);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <Label className="text-sm font-medium text-slate-700">
          {label}
        </Label>
      )}
      
      {helpText && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif"
        multiple
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading || images.length >= maxImages}
      />

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50 group"
            >
              <img
                src={getUploadUrl(imageUrl)}
                alt={`${txtPhoto} ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f1f5f9" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8"%3EErro%3C/text%3E%3C/svg%3E';
                }}
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                title={txtRemovePhoto}
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium">{txtPhoto} {index + 1}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || images.length >= maxImages}
        className="w-full border-dashed border-2 h-20 hover:border-blue-500 hover:bg-blue-50 transition-colors"
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {txtLoading}
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 mr-2" />
            {images.length === 0 
              ? txtAddPhotos 
              : `${txtAddMorePhotos} (${images.length}/${maxImages})`
            }
          </>
        )}
      </Button>

      {images.length > 0 && (
        <p className="text-xs text-green-600 font-medium">
          ✓ {images.length} {images.length === 1 ? txtPhotoAdded : txtPhotosAdded}
        </p>
      )}
    </div>
  );
}
