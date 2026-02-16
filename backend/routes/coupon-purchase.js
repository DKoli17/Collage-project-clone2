import express from 'express';
import {
  getAvailableOffers,
  getMyPurchases,
  purchaseCoupon,
  validateAndRedeemCoupon,
  getVendorPurchasedCoupons,
  getCouponByCode,
  getAllVendorsWithOffers,
  getPendingCouponApprovals,
  acceptCoupon,
  rejectCoupon,
  getVendorRevenueData,
  getCouponApprovalHistory,
} from '../controllers/couponPurchaseController.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import {
  validateCouponPurchase,
  validateCouponCode,
  validateMyPurchasesQuery,
  validateAvailableOffersQuery,
  validateCouponCodeParam,
  validateVendorCouponsQuery,
} from '../validation/couponValidation.js';

const router = express.Router();

// ============================================
// STUDENT ROUTES - Coupon Browsing & Purchase
// ============================================

/**
 * GET /api/coupon-purchase/available-offers
 * Get all available offers that students can purchase
 * Public endpoint (no auth required)
 * Query params: category, vendorId, search, limit, page
 */
router.get('/available-offers', validateAvailableOffersQuery, getAvailableOffers);

/**
 * GET /api/coupon-purchase/vendors-with-offers
 * Get all vendors with their active offers for browsing
 * Public endpoint (no auth required)
 * Query params: search, limit, page
 */
router.get('/vendors-with-offers', getAllVendorsWithOffers);

/**
 * POST /api/coupon-purchase/buy
 * Student purchases one or more coupons
 * Auth required: Student (must be approved by admin)
 * Body:
 * {
 *   offerId: string (offer._id),
 *   quantity: number (optional, default 1),
 *   transactionId: string (from payment gateway),
 *   paymentMethod: string (card, upi, netbanking, wallet)
 * }
 */
router.post('/buy', authenticateToken, authorizeRole('student'), validateCouponPurchase, purchaseCoupon);

/**
 * GET /api/coupon-purchase/my-purchases
 * Get student's coupon purchase history
 * Auth required: Student
 * Query params: status, vendorId, limit, page
 */
router.get('/my-purchases', authenticateToken, authorizeRole('student'), validateMyPurchasesQuery, getMyPurchases);

// ============================================
// VENDOR ROUTES - Coupon Validation & Management
// ============================================

/**
 * POST /api/coupon-purchase/validate
 * Vendor validates and marks coupon as used when student visits
 * Auth required: Vendor
 * Body:
 * {
 *   couponCode: string,
 *   redemptionNotes: string (optional - notes from vendor)
 * }
 */
router.post('/validate', authenticateToken, authorizeRole('vendor'), validateCouponCode, validateAndRedeemCoupon);

/**
 * GET /api/coupon-purchase/vendor-coupons
 * Get all purchased coupons for vendor's offers
 * Auth required: Vendor
 * Query params: status, limit, page
 */
router.get('/vendor-coupons', authenticateToken, authorizeRole('vendor'), validateVendorCouponsQuery, getVendorPurchasedCoupons);

/**
 * GET /api/coupon-purchase/pending-approvals
 * Get coupons pending vendor approval
 * Auth required: Vendor
 * Query params: limit, page
 */
router.get('/pending-approvals', authenticateToken, authorizeRole('vendor'), getPendingCouponApprovals);

/**
 * POST /api/coupon-purchase/accept-coupon
 * Vendor accepts a coupon and records revenue
 * Auth required: Vendor
 * Body:
 * {
 *   couponPurchaseId: string
 * }
 */
router.post('/accept-coupon', authenticateToken, authorizeRole('vendor'), acceptCoupon);

/**
 * POST /api/coupon-purchase/reject-coupon
 * Vendor rejects a coupon purchase
 * Auth required: Vendor
 * Body:
 * {
 *   couponPurchaseId: string,
 *   rejectionReason: string (optional)
 * }
 */
router.post('/reject-coupon', authenticateToken, authorizeRole('vendor'), rejectCoupon);

/**
 * GET /api/coupon-purchase/revenue-dashboard
 * Get vendor's revenue summary and statistics
 * Auth required: Vendor
 */
router.get('/revenue-dashboard', authenticateToken, authorizeRole('vendor'), getVendorRevenueData);

/**
 * GET /api/coupon-purchase/approval-history
 * Get vendor's coupon approval history
 * Auth required: Vendor
 * Query params: status, limit, page
 */
router.get('/approval-history', authenticateToken, authorizeRole('vendor'), getCouponApprovalHistory);

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /api/coupon-purchase/:couponCode
 * Get coupon details by code (public, for verification)
 * No auth required
 */
router.get('/:couponCode', validateCouponCodeParam, getCouponByCode);

export default router;
