export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateVAT = (vat, country = 'PT') => {
  if (!vat) return true;
  
  vat = vat.replace(/\s/g, '');
  
  if (country === 'PT' || country === 'Portugal') {
    const ptVatRegex = /^PT\d{9}$/i;
    return ptVatRegex.test(vat) || /^\d{9}$/.test(vat);
  }
  
  return vat.length >= 5;
};

export const validatePostalCode = (postalCode, country = 'PT') => {
  if (!postalCode) return false;
  
  postalCode = postalCode.replace(/\s/g, '');
  
  if (country === 'PT' || country === 'Portugal') {
    const ptPostalCodeRegex = /^\d{4}-?\d{3}$/;
    return ptPostalCodeRegex.test(postalCode);
  }
  
  return postalCode.length >= 3;
};

export const validatePhone = (phone) => {
  if (!phone) return true;
  
  const phoneRegex = /^[+]?[\d\s-()]{9,}$/;
  return phoneRegex.test(phone);
};

export const validateCompanyProfile = (data) => {
  const errors = {};
  
  if (!data.companyName || data.companyName.trim().length < 2) {
    errors.companyName = 'Nome da empresa é obrigatório (mínimo 2 caracteres)';
  }
  
  if (data.companyVAT && !validateVAT(data.companyVAT, data.companyCountry)) {
    errors.companyVAT = 'NIF/VAT inválido';
  }
  
  if (!data.companyCountry) {
    errors.companyCountry = 'País é obrigatório';
  }
  
  if (!data.companyDistrict || data.companyDistrict.trim().length < 2) {
    errors.companyDistrict = 'Distrito/Região é obrigatório';
  }
  
  if (!data.companyCity || data.companyCity.trim().length < 2) {
    errors.companyCity = 'Cidade é obrigatória';
  }
  
  if (!validatePostalCode(data.companyPostalCode, data.companyCountry)) {
    errors.companyPostalCode = 'Código postal inválido';
  }
  
  if (!data.companyStreetName || data.companyStreetName.trim().length < 2) {
    errors.companyStreetName = 'Nome da rua é obrigatório';
  }
  
  if (!data.companyDoorNumber || data.companyDoorNumber.trim().length < 1) {
    errors.companyDoorNumber = 'Número da porta é obrigatório';
  }
  
  if (data.companyPhone && !validatePhone(data.companyPhone)) {
    errors.companyPhone = 'Telefone inválido';
  }
  
  if (!data.companyEmail || !validateEmail(data.companyEmail)) {
    errors.companyEmail = 'Email é obrigatório e deve ser válido';
  }
  
  if (!data.companyCategory) {
    errors.companyCategory = 'Categoria é obrigatória';
  }
  
  if (!data.logoUrl) {
    errors.logoUrl = 'Logótipo é obrigatório';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
