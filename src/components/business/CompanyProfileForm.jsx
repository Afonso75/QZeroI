import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Mail, Phone, Globe, AlertCircle, Loader2, CheckCircle2, Navigation } from 'lucide-react';
import { CompanyProfile, COMPANY_CATEGORIES, companyProfileStorage } from '@/models/companyProfile';
import { validateCompanyProfile } from '@/utils/validation';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ImageUpload } from './ImageUpload';
import { STRIPE_SUPPORTED_COUNTRIES } from '@/constants/stripeCountries';
import { geocodeAddress } from '@/components/shared/LocationService';
import { useAutoTranslate } from '@/hooks/useTranslate';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { navigateBackOrFallback } from '@/hooks/useNavigateBack';

const countries = STRIPE_SUPPORTED_COUNTRIES;

const portugueseDistricts = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco",
  "Coimbra", "Évora", "Faro", "Guarda", "Leiria",
  "Lisboa", "Portalegre", "Porto", "Santarém", "Setúbal",
  "Viana do Castelo", "Vila Real", "Viseu", "Açores", "Madeira"
];

export function CompanyProfileForm({ onComplete }) {
  const navigate = useNavigate();
  
  const txtFixFormErrors = useAutoTranslate('Por favor, corrija os erros no formulário', 'pt');
  const txtProfileCreated = useAutoTranslate('Perfil empresarial criado com sucesso!', 'pt');
  const txtProfileError = useAutoTranslate('Erro ao criar perfil. Tente novamente.', 'pt');
  const txtCompanyProfile = useAutoTranslate('Perfil da Empresa', 'pt');
  const txtFillCompanyInfo = useAutoTranslate('Preencha as informações da sua empresa', 'pt');
  const txtCompanyName = useAutoTranslate('Nome da Empresa', 'pt');
  const txtBusinessCategory = useAutoTranslate('Categoria do Negócio', 'pt');
  const txtSelectCategory = useAutoTranslate('Selecione a categoria', 'pt');
  const txtDescription = useAutoTranslate('Descrição', 'pt');
  const txtDescribeServices = useAutoTranslate('Descreva os seus serviços...', 'pt');
  const txtPhone = useAutoTranslate('Telefone', 'pt');
  const txtCompanyAddress = useAutoTranslate('Morada da Empresa', 'pt');
  const txtCountry = useAutoTranslate('País', 'pt');
  const txtSelectCountry = useAutoTranslate('Selecione o país', 'pt');
  const txtOtherCountry = useAutoTranslate('Outro país', 'pt');
  const txtCountryCodeHint = useAutoTranslate('Código ISO (2 letras)', 'pt');
  const txtBackToList = useAutoTranslate('Voltar à lista', 'pt');
  const txtDistrictRegion = useAutoTranslate('Distrito/Região', 'pt');
  const txtSelectDistrict = useAutoTranslate('Selecione o distrito', 'pt');
  const txtEnterDistrict = useAutoTranslate('Digite o distrito/região', 'pt');
  const txtCity = useAutoTranslate('Cidade', 'pt');
  const txtPostalCode = useAutoTranslate('Código Postal', 'pt');
  const txtStreetName = useAutoTranslate('Rua/Avenida', 'pt');
  const txtDoorNumber = useAutoTranslate('Nº', 'pt');
  const txtCompanyLogo = useAutoTranslate('Logótipo da Empresa', 'pt');
  const txtLogoHelp = useAutoTranslate('Upload do logótipo (obrigatório)', 'pt');
  const txtEstablishmentPhoto = useAutoTranslate('Foto do Estabelecimento', 'pt');
  const txtPhotoHelp = useAutoTranslate('Upload de uma foto (opcional)', 'pt');
  const txtCancel = useAutoTranslate('Cancelar', 'pt');
  const txtSaving = useAutoTranslate('A guardar...', 'pt');
  const txtSubmitAndProceed = useAutoTranslate('Submeter e Continuar', 'pt');
  const txtSearchAddress = useAutoTranslate('Pesquisar morada completa', 'pt');
  const txtSearchHint = useAutoTranslate('Pesquise para preencher automaticamente', 'pt');
  const txtAddressFilled = useAutoTranslate('Morada preenchida!', 'pt');
  const txtUseMyLocation = useAutoTranslate('Usar minha localização', 'pt');
  const txtGettingLocation = useAutoTranslate('A obter localização...', 'pt');
  const txtLocationError = useAutoTranslate('Erro ao obter localização', 'pt');
  const txtLocationPermissionDenied = useAutoTranslate('Permissão de localização negada. Por favor, ative nas definições.', 'pt');
  const txtLocationObtained = useAutoTranslate('Localização obtida com sucesso!', 'pt');
  
  const txtCatHealth = useAutoTranslate('Saúde', 'pt');
  const txtCatFinance = useAutoTranslate('Financeiro', 'pt');
  const txtCatGovernment = useAutoTranslate('Governo', 'pt');
  const txtCatRestaurant = useAutoTranslate('Restauração', 'pt');
  const txtCatBeauty = useAutoTranslate('Beleza', 'pt');
  const txtCatRetail = useAutoTranslate('Retalho', 'pt');
  const txtCatOther = useAutoTranslate('Outros', 'pt');
  
  const translatedCategories = {
    'saude': txtCatHealth,
    'financeiro': txtCatFinance,
    'governo': txtCatGovernment,
    'restauracao': txtCatRestaurant,
    'beleza': txtCatBeauty,
    'retalho': txtCatRetail,
    'outros': txtCatOther
  };

  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [manualCountryMode, setManualCountryMode] = useState(false);
  const [addressFilled, setAddressFilled] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyCountry: 'PT',
    companyDistrict: '',
    companyCity: '',
    companyPostalCode: '',
    companyStreetName: '',
    companyDoorNumber: '',
    companyPhone: '',
    companyEmail: '',
    companyCategory: '',
    companyDescription: '',
    companyCoordinates: null,
    logoUrl: null,
    photoUrl: null
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleUseLocation = async () => {
    setGpsLoading(true);
    try {
      let latitude, longitude;

      if (Capacitor.isNativePlatform()) {
        console.log('📱 Usando Capacitor Geolocation (nativo)');
        const permStatus = await Geolocation.checkPermissions();
        
        if (permStatus.location !== 'granted') {
          const requestResult = await Geolocation.requestPermissions();
          if (requestResult.location !== 'granted') {
            toast.error(txtLocationPermissionDenied);
            setGpsLoading(false);
            return;
          }
        }
        
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
        
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } else {
        console.log('🌐 Usando navigator.geolocation (web)');
        if (!navigator.geolocation) {
          toast.error(txtLocationError);
          setGpsLoading(false);
          return;
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      console.log('✅ Coordenadas GPS obtidas:', { latitude, longitude });

      const { externalFetch } = await import('@/utils/apiConfig');
      const response = await externalFetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'QZero-App/1.0' } }
      );
      const data = await response.json();
      
      console.log('📍 Reverse geocoding result:', data);

      const updates = {
        companyCoordinates: { lat: latitude, lng: longitude }
      };

      if (data.address) {
        const addr = data.address;
        if (addr.country_code) {
          const countryCode = addr.country_code.toUpperCase();
          updates.companyCountry = countryCode;
          const countryExists = countries.some(c => c.code === countryCode);
          setManualCountryMode(!countryExists);
        }
        if (addr.state || addr.region) updates.companyDistrict = addr.state || addr.region;
        if (addr.city || addr.town || addr.village || addr.municipality) {
          updates.companyCity = addr.city || addr.town || addr.village || addr.municipality;
        }
        if (addr.postcode) updates.companyPostalCode = addr.postcode;
        if (addr.road || addr.street) updates.companyStreetName = addr.road || addr.street;
        if (addr.house_number) updates.companyDoorNumber = addr.house_number;
      }

      setFormData(prev => ({ ...prev, ...updates }));
      setAddressFilled(true);
      
      const errorFields = ['companyCountry', 'companyDistrict', 'companyCity', 'companyPostalCode', 'companyStreetName', 'companyDoorNumber'];
      setErrors(prev => {
        const newErrors = { ...prev };
        errorFields.forEach(field => delete newErrors[field]);
        return newErrors;
      });

      toast.success(txtLocationObtained);
    } catch (err) {
      console.error('❌ Erro de localização:', err);
      if (err.code === 1 || err.message?.includes('denied')) {
        toast.error(txtLocationPermissionDenied);
      } else {
        toast.error(txtLocationError);
      }
    }
    setGpsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validation = validateCompanyProfile(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      toast.error(txtFixFormErrors);
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      let coordinates = formData.companyCoordinates || null;
      
      if (!coordinates && formData.companyStreetName && formData.companyCity && formData.companyCountry) {
        const countryName = countries.find(c => c.code === formData.companyCountry)?.name || formData.companyCountry;
        
        console.log('🌍 A obter coordenadas GPS...');
        
        try {
          coordinates = await geocodeAddress(
            `${formData.companyStreetName} ${formData.companyDoorNumber}`,
            formData.companyCity,
            formData.companyPostalCode,
            countryName
          );
          
          if (coordinates) {
            console.log('✅ Coordenadas obtidas:', coordinates);
          }
        } catch (geoError) {
          console.warn('⚠️ Geocoding falhou - perfil será criado sem GPS');
        }
      }
      
      const profile = new CompanyProfile({
        ...formData,
        companyCoordinates: coordinates,
        adminUserId: user.id,
        status: 'pending_payment'
      });

      await companyProfileStorage.save(profile);
      
      toast.success(txtProfileCreated);
      
      if (onComplete) {
        onComplete(profile);
      } else {
        navigate('/business/subscription');
      }
    } catch (error) {
      console.error('Error creating company profile:', error);
      toast.error(txtProfileError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-0 shadow-xl">
      <CardHeader className="px-4 sm:px-6 pt-6 pb-4">
        <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
          </div>
          {txtCompanyProfile}
        </CardTitle>
        <CardDescription className="text-sm sm:text-base mt-2">
          {txtFillCompanyInfo}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-4 sm:px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* === INFORMAÇÕES BÁSICAS === */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="companyName" className="text-sm sm:text-base font-medium mb-2 block">
                {txtCompanyName} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Ex: Clínica Saúde+"
                  className={`pl-11 h-12 sm:h-14 text-base ${errors.companyName ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.companyName && (
                <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.companyName}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm sm:text-base font-medium mb-2 block">
                {txtBusinessCategory} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.companyCategory}
                onValueChange={(value) => handleChange('companyCategory', value)}
              >
                <SelectTrigger className={`h-12 sm:h-14 text-base ${errors.companyCategory ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder={txtSelectCategory} />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(COMPANY_CATEGORIES).map((code) => (
                    <SelectItem key={code} value={code} className="py-3 text-base">
                      {translatedCategories[code] || COMPANY_CATEGORIES[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companyCategory && (
                <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.companyCategory}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="companyDescription" className="text-sm sm:text-base font-medium mb-2 block">
                {txtDescription}
              </Label>
              <Textarea
                id="companyDescription"
                value={formData.companyDescription}
                onChange={(e) => handleChange('companyDescription', e.target.value)}
                placeholder={txtDescribeServices}
                rows={3}
                className="resize-none text-base"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyPhone" className="text-sm sm:text-base font-medium mb-2 block">
                  {txtPhone}
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="companyPhone"
                    value={formData.companyPhone}
                    onChange={(e) => handleChange('companyPhone', e.target.value)}
                    placeholder="+351 912 345 678"
                    className={`pl-11 h-12 sm:h-14 text-base ${errors.companyPhone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.companyPhone && (
                  <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.companyPhone}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="companyEmail" className="text-sm sm:text-base font-medium mb-2 block">
                  Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    id="companyEmail"
                    type="text"
                    inputMode="email"
                    value={formData.companyEmail}
                    onChange={(e) => handleChange('companyEmail', e.target.value)}
                    placeholder="contacto@empresa.pt"
                    className={`pl-11 h-12 sm:h-14 text-base ${errors.companyEmail ? 'border-red-500' : ''}`}
                    autoComplete="off"
                  />
                </div>
                {errors.companyEmail && (
                  <p className="text-sm text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.companyEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* === SECÇÃO DE MORADA === */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                {txtCompanyAddress}
              </h3>
              {addressFilled && (
                <span className="ml-auto flex items-center gap-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  {txtAddressFilled}
                </span>
              )}
            </div>

            {/* Botão GPS - Usar localização */}
            <div className="mb-4">
              <Button
                type="button"
                onClick={handleUseLocation}
                disabled={gpsLoading}
                className="w-full h-12 sm:h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium"
              >
                {gpsLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {txtGettingLocation}
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5 mr-2" />
                    {txtUseMyLocation}
                  </>
                )}
              </Button>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Ou preencha manualmente abaixo
              </p>
            </div>

            {/* Campos de Morada - Ordem Lógica */}
            <div className="space-y-4">
              
              {/* Rua + Número */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="col-span-1 sm:col-span-3">
                  <Label className="text-sm sm:text-base font-medium mb-2 block">
                    {txtStreetName} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.companyStreetName}
                    onChange={(e) => handleChange('companyStreetName', e.target.value)}
                    placeholder="Ex: Rua das Flores"
                    className={`h-12 sm:h-14 text-base ${errors.companyStreetName ? 'border-red-500' : ''}`}
                  />
                  {errors.companyStreetName && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.companyStreetName}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm sm:text-base font-medium mb-2 block">
                    {txtDoorNumber} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.companyDoorNumber}
                    onChange={(e) => handleChange('companyDoorNumber', e.target.value)}
                    placeholder="123"
                    className={`h-12 sm:h-14 text-base text-center ${errors.companyDoorNumber ? 'border-red-500' : ''}`}
                  />
                  {errors.companyDoorNumber && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                    </p>
                  )}
                </div>
              </div>

              {/* Código Postal + Cidade */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-sm sm:text-base font-medium mb-2 block">
                    {txtPostalCode} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.companyPostalCode}
                    onChange={(e) => handleChange('companyPostalCode', e.target.value)}
                    placeholder="1000-001"
                    className={`h-12 sm:h-14 text-base ${errors.companyPostalCode ? 'border-red-500' : ''}`}
                  />
                  {errors.companyPostalCode && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.companyPostalCode}
                    </p>
                  )}
                </div>
                <div className="col-span-1 sm:col-span-3">
                  <Label className="text-sm sm:text-base font-medium mb-2 block">
                    {txtCity} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.companyCity}
                    onChange={(e) => handleChange('companyCity', e.target.value)}
                    placeholder="Lisboa"
                    className={`h-12 sm:h-14 text-base ${errors.companyCity ? 'border-red-500' : ''}`}
                  />
                  {errors.companyCity && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.companyCity}
                    </p>
                  )}
                </div>
              </div>

              {/* Distrito + País */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm sm:text-base font-medium mb-2 block">
                    {txtDistrictRegion} <span className="text-red-500">*</span>
                  </Label>
                  {formData.companyCountry === 'PT' ? (
                    <Select
                      value={formData.companyDistrict}
                      onValueChange={(value) => handleChange('companyDistrict', value)}
                    >
                      <SelectTrigger className={`h-12 sm:h-14 text-base ${errors.companyDistrict ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder={txtSelectDistrict} />
                      </SelectTrigger>
                      <SelectContent>
                        {portugueseDistricts.map(district => (
                          <SelectItem key={district} value={district} className="py-3">
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formData.companyDistrict}
                      onChange={(e) => handleChange('companyDistrict', e.target.value)}
                      placeholder={txtEnterDistrict}
                      className={`h-12 sm:h-14 text-base ${errors.companyDistrict ? 'border-red-500' : ''}`}
                    />
                  )}
                  {errors.companyDistrict && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.companyDistrict}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm sm:text-base font-medium mb-2 block">
                    {txtCountry} <span className="text-red-500">*</span>
                  </Label>
                  {!manualCountryMode ? (
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10 pointer-events-none" />
                      <Select
                        value={formData.companyCountry}
                        onValueChange={(value) => {
                          if (value === '__OTHER__') {
                            setManualCountryMode(true);
                            handleChange('companyCountry', '');
                          } else {
                            handleChange('companyCountry', value);
                          }
                        }}
                      >
                        <SelectTrigger className={`pl-11 h-12 sm:h-14 text-base ${errors.companyCountry ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder={txtSelectCountry} />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map(country => (
                            <SelectItem key={country.code} value={country.code} className="py-3">
                              {country.flag} {country.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__OTHER__" className="py-3 text-indigo-600 font-medium">
                            🌍 {txtOtherCountry}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          value={formData.companyCountry}
                          onChange={(e) => handleChange('companyCountry', e.target.value.toUpperCase())}
                          placeholder="PT, BR, US..."
                          maxLength={2}
                          className={`pl-11 h-12 sm:h-14 text-base uppercase ${errors.companyCountry ? 'border-red-500' : ''}`}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {txtCountryCodeHint}{' '}
                        <button 
                          type="button" 
                          onClick={() => { setManualCountryMode(false); handleChange('companyCountry', 'PT'); }} 
                          className="text-indigo-600 hover:underline"
                        >
                          {txtBackToList}
                        </button>
                      </p>
                    </div>
                  )}
                  {errors.companyCountry && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.companyCountry}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* === IMAGENS === */}
          <div className="pt-4 sm:pt-6 border-t border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <Label className="text-sm sm:text-base font-medium mb-2 block">
                  {txtCompanyLogo} <span className="text-red-500">*</span>
                </Label>
                <ImageUpload
                  value={formData.logoUrl}
                  onChange={(url) => handleChange('logoUrl', url)}
                  label={txtLogoHelp}
                  error={errors.logoUrl}
                />
                {errors.logoUrl && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.logoUrl}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm sm:text-base font-medium mb-2 block">
                  {txtEstablishmentPhoto}
                </Label>
                <ImageUpload
                  value={formData.photoUrl}
                  onChange={(url) => handleChange('photoUrl', url)}
                  label={txtPhotoHelp}
                />
              </div>
            </div>
          </div>

          {/* === BOTÕES === */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigateBackOrFallback(navigate, '/business-subscription')}
              className="h-12 sm:h-14 text-base flex-1"
              disabled={loading}
            >
              {txtCancel}
            </Button>
            <Button
              type="submit"
              className="h-12 sm:h-14 text-base flex-[2] bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {txtSaving}
                </>
              ) : (
                txtSubmitAndProceed
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
