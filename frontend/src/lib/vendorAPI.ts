import { API_BASE_URL, getHeaders } from './api';

const VENDOR_API_BASE = `${API_BASE_URL}/vendor`;

// Get vendor profile
export const getVendorProfile = async () => {
  const response = await fetch(`${VENDOR_API_BASE}/profile`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch vendor profile');
  return response.json();
};

// Get vendor location
export const getVendorLocation = async () => {
  const response = await fetch(`${VENDOR_API_BASE}/profile`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch vendor location');
  return response.json();
};

// Find nearby students
export const getNearbyStudents = async (radius: number = 10, page: number = 1, limit: number = 10) => {
  const params = new URLSearchParams();
  params.append('radius', radius.toString());
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`${VENDOR_API_BASE}/location/nearby-students?${params}`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch nearby students');
  return response.json();
};

// Update vendor profile (includes location)
export const updateVendorProfile = async (profileData: any) => {
  const response = await fetch(`${VENDOR_API_BASE}/profile/update`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profileData),
  });
  if (!response.ok) throw new Error('Failed to update profile');
  return response.json();
};

// Get vendor dashboard overview
export const getVendorDashboard = async () => {
  const response = await fetch(`${VENDOR_API_BASE}/dashboard/overview`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch dashboard');
  return response.json();
};

// Get vendor coupons
export const getVendorCoupons = async () => {
  const response = await fetch(`${VENDOR_API_BASE}/coupons/my-coupons`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch coupons');
  return response.json();
};

// Create new coupon
export const createVendorCoupon = async (couponData: any) => {
  const response = await fetch(`${VENDOR_API_BASE}/coupons/create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(couponData),
  });
  if (!response.ok) throw new Error('Failed to create coupon');
  return response.json();
};

// Get vendor analytics
export const getVendorAnalytics = async () => {
  const response = await fetch(`${VENDOR_API_BASE}/analytics`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
};
