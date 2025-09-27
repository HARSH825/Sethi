// backend/utils/helpers.js (COMPLETE NEW FILE)
export function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  
  try {
    let birthDate;
    
    // Handle different date formats
    if (typeof dateOfBirth === 'string') {
      // Try parsing common formats
      if (dateOfBirth.includes('-')) {
        birthDate = new Date(dateOfBirth);
      } else {
        // Handle formats like "15th June 1985"
        const cleanDate = dateOfBirth
          .replace(/(\d+)(st|nd|rd|th)/, '$1')
          .replace(/\s+/g, ' ')
          .trim();
        birthDate = new Date(cleanDate);
      }
    } else {
      birthDate = new Date(dateOfBirth);
    }
    
    if (isNaN(birthDate.getTime())) {
      console.warn('Invalid date format:', dateOfBirth);
      return null;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return null;
  }
}

export function validateIndianMobile(mobile) {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile?.toString().replace(/\D/g, ''));
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cleanString(str) {
  if (!str) return '';
  return str.toString().trim();
}

export function parseLocation(locationInput) {
  if (!locationInput) return { state: null, district: null };
  
  if (typeof locationInput === 'object') {
    return locationInput;
  }
  
  if (typeof locationInput === 'string') {
    try {
      // Try parsing as JSON first
      return JSON.parse(locationInput);
    } catch {
      // If not JSON, try parsing as "State, District" or just "State"
      const parts = locationInput.split(',').map(part => part.trim());
      if (parts.length >= 2) {
        return { state: parts[0], district: parts[1] };
      } else {
        return { state: parts[0], district: null };
      }
    }
  }
  
  return { state: null, district: null };
}

export function parseDocuments(documentsInput) {
  if (!documentsInput) return {};
  
  if (typeof documentsInput === 'object') {
    return documentsInput;
  }
  
  if (typeof documentsInput === 'string') {
    try {
      return JSON.parse(documentsInput);
    } catch {
      // Parse as comma-separated list
      const docs = documentsInput.toLowerCase();
      return {
        aadhaar: docs.includes('aadhaar') || docs.includes('aadhar'),
        pan: docs.includes('pan'),
        bank_account: docs.includes('bank') || docs.includes('account'),
        income_certificate: docs.includes('income'),
        caste_certificate: docs.includes('caste'),
        voter_id: docs.includes('voter'),
        driving_license: docs.includes('driving') || docs.includes('license')
      };
    }
  }
  
  return {};
}
