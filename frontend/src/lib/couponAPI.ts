import { API_BASE_URL, getHeaders } from './api';

const COUPON_API_BASE = `${API_BASE_URL}/coupons`;

// Create a new coupon
export const createCoupon = async (couponData: any) => {
  try {
    const response = await fetch(`${COUPON_API_BASE}/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(couponData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to create coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Create coupon API error:', { message: error?.message, endpoint: `${COUPON_API_BASE}/create` });
    throw error;
  }
};

// Update a coupon
export const updateCoupon = async (couponId: string, updates: any) => {
  try {
    const response = await fetch(`${COUPON_API_BASE}/update/${couponId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to update coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Update coupon API error:', { message: error?.message, couponId, endpoint: `${COUPON_API_BASE}/update/${couponId}` });
    throw error;
  }
};

// Delete a coupon
export const deleteCoupon = async (couponId: string) => {
  try {
    const response = await fetch(`${COUPON_API_BASE}/${couponId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to delete coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Delete coupon API error:', { message: error?.message, couponId, endpoint: `${COUPON_API_BASE}/${couponId}` });
    throw error;
  }
};

// Redeem a coupon
export const redeemCoupon = async (code: string) => {
  try {
    const response = await fetch(`${COUPON_API_BASE}/redeem`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to redeem coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Redeem coupon API error:', { message: error?.message, code, endpoint: `${COUPON_API_BASE}/redeem` });
    throw error;
  }
};

// Get coupon by code (public)
export const getCouponByCode = async (code: string) => {
  try {
    const response = await fetch(`${COUPON_API_BASE}/code/${code}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Get coupon by code API error:', { message: error?.message, code, endpoint: `${COUPON_API_BASE}/code/${code}` });
    throw error;
  }
};

// Get coupon statistics
export const getCouponStats = async () => {
  try {
    const response = await fetch(`${COUPON_API_BASE}/stats`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch coupon statistics`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Get coupon stats API error:', { message: error?.message, endpoint: `${COUPON_API_BASE}/stats` });
    throw error;
  }
};

// Get redemption details for a specific coupon
export const getCouponRedemptions = async (couponId: string) => {
  try {
    const response = await fetch(`${COUPON_API_BASE}/${couponId}/redemptions`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch coupon redemptions`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Get coupon redemptions API error:', { message: error?.message, couponId, endpoint: `${COUPON_API_BASE}/${couponId}/redemptions` });
    throw error;
  }
};
// ============================================
// COUPON PURCHASE APIs
// ============================================

const COUPON_PURCHASE_API_BASE = `${API_BASE_URL}/coupon-purchase`;

// Get available offers for students to purchase
export const getAvailableOffers = async (params?: any) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.vendorId) queryParams.append('vendorId', params.vendorId);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit);
    if (params?.page) queryParams.append('page', params.page);

    const response = await fetch(`${COUPON_PURCHASE_API_BASE}/available-offers?${queryParams}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch available offers`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Get available offers API error:', { message: error?.message, params, endpoint: `${COUPON_PURCHASE_API_BASE}/available-offers` });
    throw error;
  }
};

// Student purchases coupon
export const purchaseCoupon = async (offerId: string, quantity: number = 1, transactionId?: string, paymentMethod?: string) => {
  try {
    const response = await fetch(`${COUPON_PURCHASE_API_BASE}/buy`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        offerId,
        quantity,
        transactionId,
        paymentMethod,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to purchase coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Purchase coupon API error:', { message: error?.message, offerId, quantity, endpoint: `${COUPON_PURCHASE_API_BASE}/buy` });
    throw error;
  }
};

// Get student's coupon purchases
export const getMyPurchases = async (params?: any) => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.vendorId) queryParams.append('vendorId', params.vendorId);
    if (params?.limit) queryParams.append('limit', params.limit);
    if (params?.page) queryParams.append('page', params.page);

    const response = await fetch(`${COUPON_PURCHASE_API_BASE}/my-purchases?${queryParams}`, {
      headers: getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch purchases`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Get my purchases API error:', { message: error?.message, params, endpoint: `${COUPON_PURCHASE_API_BASE}/my-purchases` });
    throw error;
  }
};

// Get pending coupon approvals for vendor
export const getPendingCouponApprovals = async (limit: number = 20, page: number = 1) => {
  try {
    const response = await fetch(
      `${COUPON_PURCHASE_API_BASE}/pending-approvals?limit=${limit}&page=${page}`,
      { headers: getHeaders() }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch pending approvals`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Get pending approvals API error:', { message: error?.message, limit, page, endpoint: `${COUPON_PURCHASE_API_BASE}/pending-approvals` });
    throw error;
  }
};

// Vendor accepts a coupon purchase (records revenue)
export const acceptCouponPurchase = async (couponPurchaseId: string) => {
  try {
    const response = await fetch(`${COUPON_PURCHASE_API_BASE}/accept-coupon`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ couponPurchaseId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to accept coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Accept coupon API error:', { message: error?.message, couponPurchaseId, endpoint: `${COUPON_PURCHASE_API_BASE}/accept-coupon` });
    throw error;
  }
};

// Vendor rejects a coupon purchase
export const rejectCouponPurchase = async (couponPurchaseId: string, rejectionReason?: string) => {
  try {
    const response = await fetch(`${COUPON_PURCHASE_API_BASE}/reject-coupon`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ couponPurchaseId, rejectionReason }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to reject coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Reject coupon API error:', { message: error?.message, couponPurchaseId, endpoint: `${COUPON_PURCHASE_API_BASE}/reject-coupon` });
    throw error;
  }
};

// Get vendor's revenue dashboard
export const getVendorRevenueData = async () => {
  try {
    const response = await fetch(`${COUPON_PURCHASE_API_BASE}/revenue-dashboard`, {
      headers: getHeaders(),
      method: 'GET',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in as a vendor.');
      }
      if (response.status === 403) {
        throw new Error('Access denied. Vendor role required.');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch revenue data`);
    }
    
    return response.json();
  } catch (error: any) {
    console.error('Revenue dashboard API error:', {
      message: error?.message,
      endpoint: `${COUPON_PURCHASE_API_BASE}/revenue-dashboard`,
    });
    throw error;
  }
};

// Get vendor coupon approval history
export const getCouponApprovalHistory = async (status?: string, limit: number = 20, page: number = 1) => {
  try {
    let url = `${COUPON_PURCHASE_API_BASE}/approval-history?limit=${limit}&page=${page}`;
    if (status) url += `&status=${status}`;
    
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch approval history`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Get approval history API error:', { message: error?.message, status, limit, page, endpoint: `${COUPON_PURCHASE_API_BASE}/approval-history` });
    throw error;
  }
};

// Get vendor's purchased coupons
export const getVendorPurchasedCoupons = async (status?: string, limit: number = 20, page: number = 1) => {
  try {
    let url = `${COUPON_PURCHASE_API_BASE}/vendor-coupons?limit=${limit}&page=${page}`;
    if (status) url += `&status=${status}`;
    
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch vendor coupons`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Get vendor coupons API error:', { message: error?.message, status, limit, page, endpoint: `${COUPON_PURCHASE_API_BASE}/vendor-coupons` });
    throw error;
  }
};

// Validate and redeem coupon (vendor-side)
export const validateAndRedeemCoupon = async (couponCode: string, redemptionNotes?: string) => {
  try {
    const response = await fetch(`${COUPON_PURCHASE_API_BASE}/validate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ couponCode, redemptionNotes }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to validate coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Validate coupon API error:', { message: error?.message, couponCode, endpoint: `${COUPON_PURCHASE_API_BASE}/validate` });
    throw error;
  }
};

// ============================================
// ADMIN COUPON PURCHASE APPROVAL APIS
// ============================================

const ADMIN_API_BASE = `${API_BASE_URL}/admin`;

// Get pending coupon purchases for admin approval
export const getAdminPendingCouponPurchases = async (limit: number = 20, page: number = 1) => {
  try {
    const response = await fetch(
      `${ADMIN_API_BASE}/coupon-purchases/pending-approval?limit=${limit}&page=${page}`,
      { headers: getHeaders() }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch pending coupons`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Admin get pending coupons API error:', { message: error?.message, limit, page, endpoint: `${ADMIN_API_BASE}/coupon-purchases/pending-approval` });
    throw error;
  }
};

// Get all coupon purchases with filters
export const getAdminCouponPurchases = async (
  adminApprovalStatus?: string,
  vendorApprovalStatus?: string,
  limit: number = 20,
  page: number = 1
) => {
  try {
    let url = `${ADMIN_API_BASE}/coupon-purchases?limit=${limit}&page=${page}`;
    if (adminApprovalStatus) url += `&adminApprovalStatus=${adminApprovalStatus}`;
    if (vendorApprovalStatus) url += `&vendorApprovalStatus=${vendorApprovalStatus}`;

    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch coupon purchases`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Admin get coupon purchases API error:', { message: error?.message, adminApprovalStatus, vendorApprovalStatus, limit, page, endpoint: `${ADMIN_API_BASE}/coupon-purchases` });
    throw error;
  }
};

// Admin approves a coupon purchase
export const approveCouponPurchase = async (couponPurchaseId: string, approvalRemarks?: string) => {
  try {
    const response = await fetch(
      `${ADMIN_API_BASE}/coupon-purchases/${couponPurchaseId}/approve`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ approvalRemarks }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to approve coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Admin approve coupon API error:', { message: error?.message, couponPurchaseId, endpoint: `${ADMIN_API_BASE}/coupon-purchases/${couponPurchaseId}/approve` });
    throw error;
  }
};

// Admin rejects a coupon purchase
export const adminRejectCouponPurchase = async (couponPurchaseId: string, rejectionReason: string) => {
  try {
    const response = await fetch(
      `${ADMIN_API_BASE}/coupon-purchases/${couponPurchaseId}/reject`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ rejectionReason }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to reject coupon`);
    }
    return response.json();
  } catch (error: any) {
    console.error('Admin reject coupon API error:', { message: error?.message, couponPurchaseId, endpoint: `${ADMIN_API_BASE}/coupon-purchases/${couponPurchaseId}/reject` });
    throw error;
  }
};
