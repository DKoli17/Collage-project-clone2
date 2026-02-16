import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation middleware for coupon purchase and validation operations
 */

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Validation rules for purchasing coupon
 * POST /api/coupon-purchase/buy
 */
export const validateCouponPurchase = [
  body('offerId')
    .notEmpty()
    .withMessage('Offer ID is required')
    .isMongoId()
    .withMessage('Invalid Offer ID format'),
  
  body('quantity')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
  
  body('transactionId')
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage('Transaction ID must be a string'),
  
  body('paymentMethod')
    .optional({ checkFalsy: true })
    .isIn(['card', 'upi', 'netbanking', 'wallet'])
    .withMessage('Invalid payment method. Must be: card, upi, netbanking, or wallet'),
  
  handleValidationErrors,
];

/**
 * Validation rules for validating and redeeming coupon
 * POST /api/coupon-purchase/validate
 */
export const validateCouponCode = [
  body('couponCode')
    .notEmpty()
    .withMessage('Coupon code is required')
    .trim()
    .isString()
    .withMessage('Coupon code must be a string')
    .isLength({ min: 3, max: 50 })
    .withMessage('Coupon code must be between 3 and 50 characters'),
  
  body('redemptionNotes')
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .withMessage('Redemption notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Redemption notes cannot exceed 500 characters'),
  
  handleValidationErrors,
];

/**
 * Validation rules for fetching my purchases
 * GET /api/coupon-purchase/my-purchases
 */
export const validateMyPurchasesQuery = [
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'used', 'expired', 'cancelled'])
    .withMessage('Invalid status. Must be: active, used, expired, or cancelled'),
  
  query('vendorId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Invalid vendor ID format'),
  
  query('limit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('page')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0'),
  
  handleValidationErrors,
];

/**
 * Validation rules for fetching available offers
 * GET /api/coupon-purchase/available-offers
 */
export const validateAvailableOffersQuery = [
  query('category')
    .optional({ checkFalsy: true })
    .isIn([
      'food', 'retail', 'entertainment', 'technology', 'travel',
      'education', 'health', 'sports', 'other'
    ])
    .withMessage('Invalid category'),
  
  query('vendorId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Invalid vendor ID format'),
  
  query('search')
    .optional({ checkFalsy: true })
    .trim()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),
  
  query('limit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('page')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0'),
  
  handleValidationErrors,
];

/**
 * Validation rules for fetching coupon by code
 * GET /api/coupon-purchase/:couponCode
 */
export const validateCouponCodeParam = [
  param('couponCode')
    .notEmpty()
    .withMessage('Coupon code is required')
    .trim()
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage('Invalid coupon code format'),
  
  handleValidationErrors,
];

/**
 * Validation rules for vendor fetching their coupons
 * GET /api/coupon-purchase/vendor-coupons
 */
export const validateVendorCouponsQuery = [
  query('status')
    .optional({ checkFalsy: true })
    .isIn(['active', 'used', 'expired', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('limit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('page')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0'),
  
  handleValidationErrors,
];
