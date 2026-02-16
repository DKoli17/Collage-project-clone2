import { API_BASE_URL, getHeaders } from './api';

const STUDENT_API_BASE = `${API_BASE_URL}/student`;

// Get student dashboard
export const getStudentDashboard = async () => {
  const response = await fetch(`${STUDENT_API_BASE}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch dashboard');
  return response.json();
};

// Get student's active discounts
export const getStudentDiscounts = async (page = 1, limit = 10) => {
  const response = await fetch(
    `${STUDENT_API_BASE}/discounts?page=${page}&limit=${limit}`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch discounts');
  return response.json();
};

// Get all active coupons for student
export const getActiveCoupons = async (page = 1, limit = 10) => {
  const response = await fetch(
    `${STUDENT_API_BASE}/coupons?page=${page}&limit=${limit}`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch coupons');
  return response.json();
};

// Get offers by category
export const getOffersByCategory = async (category: string, page = 1, limit = 10) => {
  const response = await fetch(
    `${STUDENT_API_BASE}/offers/category/${category}?page=${page}&limit=${limit}`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch offers');
  return response.json();
};

// Search offers
export const searchOffers = async (query?: string, category?: string, page = 1, limit = 10) => {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (category) params.append('category', category);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`${STUDENT_API_BASE}/offers/search?${params}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to search offers');
  return response.json();
};

// Redeem an offer
export const redeemOffer = async (offerId: string, redemptionType: 'online' | 'in-store') => {
  const response = await fetch(`${STUDENT_API_BASE}/offers/redeem`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ offerId, redemptionType }),
  });
  if (!response.ok) throw new Error('Failed to redeem offer');
  return response.json();
};

// Save an offer
export const saveOffer = async (offerId: string) => {
  const response = await fetch(`${STUDENT_API_BASE}/offers/save`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ offerId }),
  });
  if (!response.ok) throw new Error('Failed to save offer');
  return response.json();
};

// Unsave an offer
export const unsaveOffer = async (offerId: string) => {
  const response = await fetch(`${STUDENT_API_BASE}/offers/unsave`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ offerId }),
  });
  if (!response.ok) throw new Error('Failed to unsave offer');
  return response.json();
};

// Get saved offers
export const getSavedOffers = async (page = 1, limit = 10) => {
  const response = await fetch(
    `${STUDENT_API_BASE}/offers/saved?page=${page}&limit=${limit}`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch saved offers');
  return response.json();
};

// Get verification status
export const getVerificationStatus = async () => {
  const response = await fetch(`${STUDENT_API_BASE}/verification-status`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch verification status');
  return response.json();
};
// Get coupons with vendor location information
export const getCouponsWithLocation = async (page = 1, limit = 10) => {
  const response = await fetch(
    `${STUDENT_API_BASE}/coupons-with-location?page=${page}&limit=${limit}`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch coupons with location');
  return response.json();
};

// Get nearby vendors and their coupons
export const getVendorsByLocation = async (latitude: number, longitude: number, radiusKm: number = 10, page = 1, limit = 10) => {
  const params = new URLSearchParams();
  params.append('latitude', latitude.toString());
  params.append('longitude', longitude.toString());
  params.append('radius', radiusKm.toString());
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await fetch(
    `${STUDENT_API_BASE}/vendors-by-location?${params}`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch vendors by location');
  return response.json();
};

// Get vendor details with location and coupons
export const getVendorLocation = async (vendorId: string) => {
  const response = await fetch(
    `${STUDENT_API_BASE}/vendors/${vendorId}/location`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch vendor location details');
  return response.json();
};

// Update student location
export const updateStudentLocation = async (latitude: number, longitude: number, locality?: string, postalCode?: string, city?: string, state?: string) => {
  const response = await fetch(`${STUDENT_API_BASE}/update-location`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      latitude,
      longitude,
      locality,
      postalCode,
      city,
      state
    })
  });
  if (!response.ok) throw new Error('Failed to update location');
  return response.json();
};

// Get student location
export const getStudentLocation = async () => {
  const response = await fetch(`${STUDENT_API_BASE}/location`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch student location');
  return response.json();
};

// Find nearby vendors for claiming coupons (based on student location)
export const getNearbyVendorsForClaim = async (radiusKm: number = 10, page = 1, limit = 10) => {
  const params = new URLSearchParams();
  params.append('radius', radiusKm.toString());
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await fetch(
    `${STUDENT_API_BASE}/nearby-vendors-for-claim?${params}`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch nearby vendors');
  return response.json();
};
// Get nearby vendors using student's location (mirrors vendor's nearby-students endpoint)
export const getNearbyVendors = async (radiusKm: number = 10, page = 1, limit = 10) => {
  const params = new URLSearchParams();
  params.append('radius', radiusKm.toString());
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await fetch(
    `${STUDENT_API_BASE}/location/nearby-vendors?${params}`,
    { headers: getHeaders() }
  );
  if (!response.ok) throw new Error('Failed to fetch nearby vendors');
  return response.json();
};