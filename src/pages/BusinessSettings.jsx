import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { safeFetch } from "@/utils/apiConfig";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft,
  Building2,
  Save,
  MessageSquare,
  ChevronRight,
  User,
  Phone,
  MapPin,
  Image
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import FeedbackManager from "../components/business/FeedbackManager";
import { ImageUpload } from "../components/business/ImageUpload";
import { MultiImageUpload } from "../components/business/MultiImageUpload";
import { AddressAutocomplete } from "../components/business/AddressAutocomplete";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { STRIPE_SUPPORTED_COUNTRIES } from "@/constants/stripeCountries";
import { useAutoTranslate } from "@/hooks/useTranslate";

const countries = STRIPE_SUPPORTED_COUNTRIES;

export default function BusinessSettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [businessData, setBusinessData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  const txtBusinessSettings = useAutoTranslate('Configurações', 'pt');
  const txtChooseSettings = useAutoTranslate('Escolha o que deseja configurar', 'pt');
  const txtBackToDashboard = useAutoTranslate('Voltar ao Painel', 'pt');
  const txtProfileUpdatedSuccess = useAutoTranslate('Perfil atualizado com sucesso!', 'pt');
  const txtErrorUpdatingProfile = useAutoTranslate('Erro ao atualizar perfil', 'pt');
  const txtCompanyNameRequired = useAutoTranslate('Nome da empresa é obrigatório.', 'pt');
  const txtSpecifyBusinessType = useAutoTranslate('Por favor, especifique o tipo de negócio quando seleciona "Outros".', 'pt');
  const txtAddressFilled = useAutoTranslate('✅ Morada preenchida automaticamente!', 'pt');
  const txtSaving = useAutoTranslate('Salvando...', 'pt');
  const txtSaveChanges = useAutoTranslate('Salvar Alterações', 'pt');
  const txtCompanyProfile = useAutoTranslate('Perfil da Empresa', 'pt');
  const txtNameCategoryContacts = useAutoTranslate('Nome, categoria e contactos', 'pt');
  const txtFeedback = useAutoTranslate('Feedback', 'pt');
  const txtClientReviews = useAutoTranslate('Avaliações dos clientes', 'pt');
  const txtBack = useAutoTranslate('Anterior', 'pt');
  const txtName = useAutoTranslate('Nome', 'pt');
  const txtCategory = useAutoTranslate('Categoria', 'pt');
  const txtSelect = useAutoTranslate('Selecione', 'pt');
  const txtSpecifyBusinessTypeLabel = useAutoTranslate('Especifique o tipo', 'pt');
  const txtHealthcare = useAutoTranslate('Saúde', 'pt');
  const txtFinancial = useAutoTranslate('Financeiro', 'pt');
  const txtGovernment = useAutoTranslate('Governo', 'pt');
  const txtRestaurant = useAutoTranslate('Restauração', 'pt');
  const txtBeauty = useAutoTranslate('Beleza', 'pt');
  const txtOthers = useAutoTranslate('Outros', 'pt');
  const txtDescription = useAutoTranslate('Descrição', 'pt');
  const txtDescriptionPlaceholder = useAutoTranslate('Descreva seus serviços...', 'pt');
  const txtPhone = useAutoTranslate('Telefone', 'pt');
  const txtEmail = useAutoTranslate('Email', 'pt');
  const txtCountry = useAutoTranslate('País', 'pt');
  const txtSelectCountry = useAutoTranslate('Selecione o país', 'pt');
  const txtDistrictRegion = useAutoTranslate('Distrito', 'pt');
  const txtSearchAddressGoogleMaps = useAutoTranslate('Pesquisar Morada', 'pt');
  const txtAddressHelp = useAutoTranslate('Comece a escrever para preencher automaticamente', 'pt');
  const txtCity = useAutoTranslate('Cidade', 'pt');
  const txtPostalCode = useAutoTranslate('Código Postal', 'pt');
  const txtStreetName = useAutoTranslate('Rua', 'pt');
  const txtDoorNumber = useAutoTranslate('Nº Porta', 'pt');
  const txtAddressRequired = useAutoTranslate('Morada obrigatória para distâncias.', 'pt');
  const txtCompanyLogo = useAutoTranslate('Logótipo', 'pt');
  const txtPhotoGallery = useAutoTranslate('Galeria de Fotos', 'pt');
  const txtPhotoGalleryHelp = useAutoTranslate('Adicione fotos da empresa', 'pt');
  const txtRetail = useAutoTranslate('Retalho', 'pt');
  const txtBasicInfo = useAutoTranslate('Informações Básicas', 'pt');
  const txtContactInfo = useAutoTranslate('Contacto', 'pt');
  const txtAddressInfo = useAutoTranslate('Morada', 'pt');
  const txtMediaInfo = useAutoTranslate('Imagens', 'pt');
  
  const categories = [
    { value: "saude", label: txtHealthcare },
    { value: "financeiro", label: txtFinancial },
    { value: "governo", label: txtGovernment },
    { value: "restauracao", label: txtRestaurant },
    { value: "beleza", label: txtBeauty },
    { value: "retalho", label: txtRetail },
    { value: "outros", label: txtOthers }
  ];

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (!userData.is_business_user || !userData.business_id) {
        navigate(createPageUrl("Home"));
      }
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, [navigate]);

  const { data: business, isLoading } = useQuery({
    queryKey: ['company-profile', user?.business_id],
    queryFn: async () => {
      const { response, data: profile } = await safeFetch(`/api/company-profiles/${user.business_id}`);
      if (!response.ok) throw new Error('Failed to fetch company profile');
      
      const mappedProfile = {
        ...profile,
        name: profile.companyName,
        category: profile.companyCategory,
        phone: profile.companyPhone,
        email: profile.companyEmail,
        description: profile.companyDescription,
        country: profile.companyCountry,
        district: profile.companyDistrict,
        city: profile.companyCity,
        postal_code: profile.companyPostalCode,
        street_name: profile.companyStreetName,
        door_number: profile.companyDoorNumber,
        address: profile.companyAddress,
        custom_category: profile.customCategory,
        logo_url: profile.logoUrl,
        photo_url: profile.photoUrl,
        media_gallery: profile.mediaGallery,
        latitude: profile.companyCoordinates?.latitude,
        longitude: profile.companyCoordinates?.longitude
      };
      
      setBusinessData(mappedProfile);
      setOriginalData(mappedProfile);
      setHasChanges(false);
      return mappedProfile;
    },
    enabled: !!user?.business_id,
  });

  const updateBusinessMutation = useMutation({
    mutationFn: async (updates) => {
      const { response, data } = await safeFetch(`/api/company-profiles/${user.business_id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data?.error || 'Update failed'}`);
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      toast.success(txtProfileUpdatedSuccess);
      setOriginalData(businessData);
      setHasChanges(false);
    },
    onError: (error) => {
      console.error('Error updating business:', error);
      toast.error(txtErrorUpdatingProfile);
      queryClient.invalidateQueries({ queryKey: ['company-profile', user?.business_id] });
    }
  });

  const handleBusinessUpdate = async () => {
    if (!businessData.name?.trim()) {
      toast.error(txtCompanyNameRequired);
      return;
    }
    
    if (businessData.category === 'outros' && !businessData.custom_category?.trim()) {
      toast.error(txtSpecifyBusinessType);
      return;
    }
    
    const hasCompleteAddress = businessData.street_name && businessData.door_number && 
                                businessData.postal_code && businessData.city && 
                                businessData.district && businessData.country;
    
    const mappedUpdates = {
      companyName: businessData.name,
      companyCategory: businessData.category,
      companyPhone: businessData.phone,
      companyEmail: businessData.email,
      companyDescription: businessData.description,
      companyCountry: businessData.country,
      companyDistrict: businessData.district,
      companyCity: businessData.city,
      companyPostalCode: businessData.postal_code,
      companyStreetName: businessData.street_name,
      companyDoorNumber: businessData.door_number,
      logoUrl: businessData.logo_url,
      photoUrl: businessData.photo_url,
      mediaGallery: businessData.media_gallery,
      updatedAt: new Date()
    };
    
    if (businessData.category === 'outros') {
      mappedUpdates.customCategory = businessData.custom_category || '';
    } else {
      mappedUpdates.customCategory = null;
    }

    if (hasCompleteAddress) {
      const countryName = countries.find(c => c.code === businessData.country)?.name || businessData.country;
      const fullAddress = `${businessData.street_name} ${businessData.door_number}, ${businessData.postal_code} ${businessData.city}, ${businessData.district}, ${countryName}`;
      
      mappedUpdates.companyAddress = fullAddress;
      
      // Sempre fazer geocoding da morada manual para obter coordenadas exactas
      try {
        const { response, data } = await safeFetch('/api/geocode-address', {
          method: 'POST',
          body: JSON.stringify({
            address: `${businessData.street_name} ${businessData.door_number}`,
            city: businessData.city,
            postalCode: businessData.postal_code,
            country: countryName
          })
        });
        
        if (response.ok && data?.lat && data?.lng) {
          mappedUpdates.companyCoordinates = {
            latitude: data.lat,
            longitude: data.lng
          };
          console.log('✅ Coordenadas actualizadas para morada manual:', { lat: data.lat, lng: data.lng, precision: data.precision });
        } else if (businessData.latitude && businessData.longitude) {
          // Fallback para coordenadas existentes se geocoding falhar
          mappedUpdates.companyCoordinates = {
            latitude: businessData.latitude,
            longitude: businessData.longitude
          };
        }
      } catch (err) {
        console.warn('⚠️ Geocoding falhou, usando coordenadas existentes:', err);
        if (businessData.latitude && businessData.longitude) {
          mappedUpdates.companyCoordinates = {
            latitude: businessData.latitude,
            longitude: businessData.longitude
          };
        }
      }
    }
    
    const cleanUpdates = Object.fromEntries(
      Object.entries(mappedUpdates).filter(([_, value]) => value !== undefined && value !== null)
    );
    
    updateBusinessMutation.mutate(cleanUpdates);
  };

  const autoSaveImageMutation = useMutation({
    mutationFn: async (imageData) => {
      const { response, data } = await safeFetch(`/api/company-profiles/${user.business_id}`, {
        method: 'PUT',
        body: JSON.stringify(imageData)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data?.error || 'Update failed'}`);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] });
      console.log('✅ Imagem auto-salva com sucesso');
    },
    onError: (error) => {
      console.error('❌ Erro ao auto-salvar imagem:', error);
    }
  });

  const handleChange = (field, value) => {
    setBusinessData(prev => {
      const updated = { ...prev, [field]: value };
      
      if (field === 'category' && value !== 'outros' && prev.category === 'outros') {
        updated.custom_category = '';
      }
      
      // Verificar se há alterações comparando com dados originais
      const hasAnyChange = Object.keys(updated).some(key => {
        // Ignorar campos que não são editáveis
        if (['id', 'createdAt', 'updatedAt'].includes(key)) return false;
        return JSON.stringify(updated[key]) !== JSON.stringify(originalData[key]);
      });
      setHasChanges(hasAnyChange);
      
      return updated;
    });
    
    if (field === 'logo_url' || field === 'photo_url' || field === 'media_gallery') {
      const fieldMap = {
        'logo_url': 'logoUrl',
        'photo_url': 'photoUrl',
        'media_gallery': 'mediaGallery'
      };
      autoSaveImageMutation.mutate({ [fieldMap[field]]: value });
    }
  };

  if (!user || isLoading) {
    return (
      <div className="bg-slate-50 p-2 lg:p-4">
        <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto">
          <Skeleton className="h-8 lg:h-10 w-32 lg:w-48 mb-3 lg:mb-6" />
          <Skeleton className="h-12 lg:h-16 w-full mb-2 lg:mb-4" />
          <Skeleton className="h-12 lg:h-16 w-full" />
        </div>
      </div>
    );
  }

  const sections = [
    {
      id: 'profile',
      icon: Building2,
      title: txtCompanyProfile,
      description: txtNameCategoryContacts,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'feedback',
      icon: MessageSquare,
      title: txtFeedback,
      description: txtClientReviews,
      color: 'from-amber-500 to-orange-500'
    }
  ];

  if (activeSection) {
    return (
      <div className="bg-slate-50">
        <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto px-2 lg:px-6 py-2 lg:py-6 pb-32 lg:pb-20">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 lg:mb-4 gap-1 lg:gap-2 h-7 lg:h-9 text-xs lg:text-sm px-2 lg:px-4"
            onClick={() => setActiveSection(null)}
          >
            <ArrowLeft className="w-3 h-3 lg:w-4 lg:h-4" />
            {txtBack}
          </Button>

          {activeSection === 'profile' && (
            <div className="space-y-2 lg:space-y-4">
              <div className="flex items-center gap-2 lg:gap-3 px-1 mb-2 lg:mb-4">
                <div className="w-7 h-7 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-white" />
                </div>
                <h1 className="text-sm lg:text-xl font-bold text-slate-900">{txtCompanyProfile}</h1>
              </div>

              <Accordion type="single" collapsible defaultValue="basic" className="space-y-1 lg:space-y-3">
                <AccordionItem value="basic" className="border rounded-lg lg:rounded-xl bg-white shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-3 lg:px-5 py-2 lg:py-4 hover:no-underline hover:bg-slate-50 text-left">
                    <div className="flex items-center gap-2 lg:gap-3">
                      <User className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-blue-600" />
                      <span className="text-xs lg:text-base font-medium">{txtBasicInfo}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 lg:px-5 pb-2.5 lg:pb-5 pt-0">
                    <div className="space-y-2 lg:space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-[10px] lg:text-xs text-slate-500 uppercase tracking-wide">{txtName}</Label>
                        <Input
                          id="name"
                          value={businessData.name || ''}
                          onChange={(e) => handleChange('name', e.target.value)}
                          placeholder="Ex: Clínica Dr. Silva"
                          className="mt-0.5 lg:mt-1 h-8 lg:h-10 text-xs lg:text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="category" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtCategory}</Label>
                        <Select
                          value={businessData.category || ''}
                          onValueChange={(value) => handleChange('category', value)}
                        >
                          <SelectTrigger className="mt-0.5 h-8 text-xs">
                            <SelectValue placeholder={txtSelect} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(cat => (
                              <SelectItem key={cat.value} value={cat.value} className="text-xs">
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {businessData.category === 'outros' && (
                        <div>
                          <Label htmlFor="custom_category" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtSpecifyBusinessTypeLabel}</Label>
                          <Input
                            id="custom_category"
                            value={businessData.custom_category || ''}
                            onChange={(e) => handleChange('custom_category', e.target.value)}
                            placeholder="Ex: Oficina Mecânica"
                            className="mt-0.5 h-8 text-xs"
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="description" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtDescription}</Label>
                        <Textarea
                          id="description"
                          value={businessData.description || ''}
                          onChange={(e) => handleChange('description', e.target.value)}
                          placeholder={txtDescriptionPlaceholder}
                          rows={2}
                          className="mt-0.5 resize-none text-xs min-h-[48px]"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="contact" className="border rounded-lg bg-white shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 text-left">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-xs font-medium">{txtContactInfo}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2.5 pt-0">
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="phone" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtPhone}</Label>
                        <Input
                          id="phone"
                          value={businessData.phone || ''}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="+351 912 345 678"
                          className="mt-0.5 h-8 text-xs"
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtEmail}</Label>
                        <Input
                          id="email"
                          type="text"
                          inputMode="email"
                          value={businessData.email || ''}
                          onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="contacto@empresa.pt"
                          className="mt-0.5 h-8 text-xs"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="address" className="border rounded-lg bg-white shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 text-left">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-medium">{txtAddressInfo}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2.5 pt-0">
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="country" className="text-[10px] text-slate-500 uppercase tracking-wide">{txtCountry}</Label>
                        <Select
                          value={businessData.country || ''}
                          onValueChange={(value) => handleChange('country', value)}
                        >
                          <SelectTrigger className="mt-0.5 h-8 text-xs">
                            <SelectValue placeholder={txtSelectCountry} />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(country => (
                              <SelectItem key={country.code} value={country.code} className="text-xs">
                                {country.flag} {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <AddressAutocomplete
                        onAddressSelect={(addressData) => {
                          const isFromAutocomplete = addressData.geometry && !addressData.isManualEntry;
                          
                          if (addressData.country) handleChange('country', addressData.country.toUpperCase());
                          if (addressData.district) handleChange('district', addressData.district);
                          if (addressData.city) handleChange('city', addressData.city);
                          if (addressData.postalCode) handleChange('postal_code', addressData.postalCode);
                          if (addressData.streetName) handleChange('street_name', addressData.streetName);
                          if (addressData.streetNumber) handleChange('door_number', addressData.streetNumber);
                          if (addressData.geometry) {
                            handleChange('latitude', addressData.geometry.lat);
                            handleChange('longitude', addressData.geometry.lng);
                          }
                          if (isFromAutocomplete) {
                            toast.success(txtAddressFilled);
                          }
                        }}
                        countryCode={businessData.country || 'PT'}
                        placeholder="Pesquisar morada..."
                        compact={true}
                        initialValues={{
                          streetName: businessData.street_name || '',
                          streetNumber: businessData.door_number || '',
                          city: businessData.city || '',
                          district: businessData.district || '',
                          postalCode: businessData.postal_code || ''
                        }}
                      />
                      
                      <p className="text-[9px] text-slate-400">{txtAddressRequired}</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="media" className="border rounded-lg bg-white shadow-sm overflow-hidden">
                  <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-50 text-left">
                    <div className="flex items-center gap-2">
                      <Image className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-medium">{txtMediaInfo}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-2.5 pt-0">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-[10px] text-slate-500 uppercase tracking-wide">{txtCompanyLogo}</Label>
                        <div className="mt-1">
                          <ImageUpload
                            label=""
                            value={businessData.logo_url}
                            onChange={(url) => handleChange('logo_url', url)}
                            required={false}
                          />
                        </div>
                      </div>

                      <div>
                        <MultiImageUpload
                          label={txtPhotoGallery}
                          value={businessData.media_gallery || []}
                          onChange={(images) => handleChange('media_gallery', images)}
                          maxImages={10}
                          helpText={txtPhotoGalleryHelp}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {hasChanges && (
                <div className="fixed bottom-20 left-0 right-0 p-2 lg:p-4 bg-white border-t shadow-lg z-40 lg:bottom-0">
                  <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto">
                    <Button
                      size="sm"
                      onClick={handleBusinessUpdate}
                      disabled={updateBusinessMutation.isPending}
                      className="w-full gap-1.5 lg:gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 h-9 lg:h-11 text-xs lg:text-base"
                    >
                      <Save className="w-3.5 h-3.5 lg:w-5 lg:h-5" />
                      {updateBusinessMutation.isPending ? txtSaving : txtSaveChanges}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'feedback' && (
            <div>
              <div className="flex items-center gap-2 lg:gap-3 px-1 mb-2 lg:mb-4">
                <div className="w-7 h-7 lg:w-10 lg:h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-white" />
                </div>
                <h1 className="text-sm lg:text-xl font-bold text-slate-900">{txtFeedback}</h1>
              </div>
              <FeedbackManager businessId={user.business_id} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50">
      <div className="max-w-lg lg:max-w-3xl xl:max-w-4xl mx-auto px-2 lg:px-4 py-2 lg:py-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 lg:mb-4 gap-1 lg:gap-2 h-7 lg:h-9 text-xs lg:text-sm px-2 lg:px-4"
          onClick={() => navigate(createPageUrl("BusinessDashboard"))}
        >
          <ArrowLeft className="w-3 h-3 lg:w-4 lg:h-4" />
          {txtBackToDashboard}
        </Button>

        <div className="mb-3 lg:mb-6 px-1">
          <h1 className="text-lg lg:text-2xl font-bold text-slate-900">
            {txtBusinessSettings}
          </h1>
          <p className="text-[11px] lg:text-sm text-slate-500">
            {txtChooseSettings}
          </p>
        </div>

        <div className="space-y-1.5 lg:space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {sections.map((section) => (
            <Card
              key={section.id}
              className="border-0 shadow-sm lg:shadow-md active:scale-[0.98] transition-transform cursor-pointer hover:shadow-lg"
              onClick={() => setActiveSection(section.id)}
            >
              <CardContent className="p-2.5 lg:p-5">
                <div className="flex items-center gap-2.5 lg:gap-4">
                  <div className={`w-9 h-9 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center flex-shrink-0`}>
                    <section.icon className="w-4 h-4 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs lg:text-lg text-slate-900">
                      {section.title}
                    </h3>
                    <p className="text-[10px] lg:text-sm text-slate-500 truncate">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 lg:w-6 lg:h-6 text-slate-300 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
