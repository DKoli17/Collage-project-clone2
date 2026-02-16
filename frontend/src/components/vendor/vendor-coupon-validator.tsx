import { useState, useEffect } from 'react';
import { Search, CheckCircle, AlertCircle, Loader, X, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../lib/api';

interface ValidatedCoupon {
  couponCode: string;
  couponId: string;
  studentName: string;
  studentEmail: string;
  studentId: string;
  discountValue: number;
  discountType: string;
  discountLabel: string;
  status: string;
  usedAt: string;
  purchasedAt: string;
  expiryDate: string;
  redemptionNotes?: string;
  offerTitle?: string;
}

interface CouponHistory {
  _id: string;
  couponCode: string;
  studentId: {
    name: string;
    email: string;
    studentId: string;
  };
  status: string;
  discountValue: number;
  discountType: string;
  usedAt?: string;
  purchasedAt: string;
  expiryDate: string;
}

interface ErrorResponse {
  message: string;
  errorType?: string;
  usedAt?: string;
  expiryDate?: string;
  daysExpired?: number;
  [key: string]: any;
}

export function VendorCouponValidator() {
  const [couponInput, setCouponInput] = useState('');
  const [validatedCoupon, setValidatedCoupon] = useState<ValidatedCoupon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [success, setSuccess] = useState(false);
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<CouponHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (showHistory) {
      fetchCouponHistory();
    }
  }, [showHistory]);

  const fetchCouponHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.get('/coupon-purchase/vendor-coupons?limit=10&page=1');
      setHistory(response.data.coupons);
    } catch (err) {
      console.error('Failed to fetch coupon history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getErrorDisplay = (errorData: ErrorResponse) => {
    const errorType = errorData.errorType || 'UNKNOWN_ERROR';
    
    const errorDetails: { [key: string]: { title: string; description: string; icon: string; color: string } } = {
      MISSING_CODE: {
        title: '⚠️ Please Enter Code',
        description: 'You must provide a coupon code to validate',
        icon: 'AlertCircle',
        color: 'yellow',
      },
      COUPON_NOT_FOUND: {
        title: '❌ Coupon Not Found',
        description: `No coupon found with code: ${errorData.providedCode || 'Unknown'}. Please check the code and try again.`,
        icon: 'X',
        color: 'red',
      },
      VENDOR_MISMATCH: {
        title: '🚫 Not Your Coupon',
        description: `This coupon is assigned to a different vendor. Code: ${errorData.couponCode}`,
        icon: 'AlertCircle',
        color: 'red',
      },
      COUPON_ALREADY_USED: {
        title: '⏰ Coupon Already Used',
        description: `This coupon was already redeemed on ${errorData.usedAt ? new Date(errorData.usedAt).toLocaleDateString() : 'unknown date'} by student ${errorData.studentName}`,
        icon: 'Clock',
        color: 'orange',
      },
      COUPON_CANCELLED: {
        title: '🚫 Coupon Cancelled',
        description: 'This coupon has been cancelled and cannot be redeemed.',
        icon: 'X',
        color: 'red',
      },
      COUPON_EXPIRED: {
        title: '📅 Coupon Expired',
        description: `This coupon expired on ${errorData.expiryDate ? new Date(errorData.expiryDate).toLocaleDateString() : 'unknown date'} (${errorData.daysExpired} days ago). Please ask the student for a valid coupon.`,
        icon: 'Calendar',
        color: 'red',
      },
      INVALID_STATUS: {
        title: '⚠️ Cannot Redeem',
        description: `This coupon's status is "${errorData.currentStatus}" and cannot be redeemed.`,
        icon: 'AlertCircle',
        color: 'orange',
      },
      SYSTEM_ERROR: {
        title: '🔴 System Error',
        description: 'A system error occurred while validating. Please try again.',
        icon: 'AlertCircle',
        color: 'red',
      },
      UNKNOWN_ERROR: {
        title: '❌ Validation Error',
        description: errorData.message || 'An unexpected error occurred',
        icon: 'AlertCircle',
        color: 'red',
      },
    };

    return errorDetails[errorType] || errorDetails.UNKNOWN_ERROR;
  };

  const handleValidateCoupon = async () => {
    const code = couponInput.trim().toUpperCase();

    if (!code) {
      setError({
        message: 'Please enter a coupon code',
        errorType: 'MISSING_CODE',
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const response = await api.post('/coupon-purchase/validate', {
        couponCode: code,
        redemptionNotes: notes,
      });

      setValidatedCoupon(response.data.coupon);
      setSuccess(true);
      setCouponInput('');
      setNotes('');

      // Refresh history
      if (showHistory) {
        fetchCouponHistory();
      }

      // Reset after 5 seconds
      setTimeout(() => {
        setSuccess(false);
        setValidatedCoupon(null);
      }, 5000);
    } catch (err: any) {
      const errorData = err.response?.data || {};
      setError({
        message: errorData.message || 'Failed to validate coupon',
        errorType: errorData.errorType || 'UNKNOWN_ERROR',
        ...errorData,
      });
      setValidatedCoupon(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidateCoupon();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Coupon Validator</h1>
        <p className="text-gray-600">Validate and redeem student coupons when they visit your store</p>
      </div>

      {/* Main Validator Card */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        {/* Success Message */}
        {success && validatedCoupon && (
          <div className="mb-6 bg-green-50 border-2 border-green-500 rounded-lg p-6 flex gap-4">
            <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-green-900 mb-3">✅ Coupon Valid & Redeemed!</h3>
              <div className="bg-white rounded-lg p-4 space-y-2 mb-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Student:</span>
                  <span className="font-semibold text-gray-900">{validatedCoupon.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-bold text-green-600">{validatedCoupon.discountLabel}</span>
                </div>
                {validatedCoupon.offerTitle && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Offer:</span>
                    <span className="font-semibold text-gray-900">{validatedCoupon.offerTitle}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Code:</span>
                  <span className="font-mono text-purple-600 font-semibold">{validatedCoupon.couponCode}</span>
                </div>
              </div>
              <p className="text-sm font-bold text-green-700 bg-green-100 p-3 rounded">
                👉 Please apply {validatedCoupon.discountLabel} to this purchase.
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setValidatedCoupon(null);
              }}
              className="text-green-600 hover:text-green-800 flex-shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Input Section */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Enter Coupon Code
          </label>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="E.g., COUPON123ABC"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 font-mono text-lg"
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleValidateCoupon}
              disabled={loading || !couponInput.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-8 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader className="w-5 h-5 animate-spin" />}
              {loading ? 'Validating...' : 'Validate'}
            </Button>
          </div>
        </div>

        {/* Notes Section (shown when validating) */}
        {couponInput && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this purchase or customer..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 flex gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2">{getErrorDisplay(error).title}</h3>
              <p className="text-sm text-red-800">{getErrorDisplay(error).description}</p>
              {error.expiryDate && error.errorType === 'COUPON_EXPIRED' && (
                <p className="text-xs text-red-700 mt-2">
                  <Calendar className="inline w-3 h-3 mr-1" />
                  Expired: {new Date(error.expiryDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Info Message */}
        {!success && !error && !couponInput && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 How to use this validator:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Customer shows the coupon code (physical or screenshot)</li>
              <li>2. Enter the coupon code in the field above</li>
              <li>3. Click "Validate" to verify authenticity</li>
              <li>4. If valid, apply the discount and the coupon will be marked as used</li>
            </ol>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="mb-8">
        <Button
          onClick={() => setShowHistory(!showHistory)}
          className="mb-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-6 py-2 rounded-lg"
        >
          {showHistory ? '✕ Hide' : '📊 Show'} Coupon History
        </Button>

        {showHistory && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Recent Coupons</h2>
              <p className="text-sm text-gray-600">Last 10 coupons validated</p>
            </div>

            {historyLoading ? (
              <div className="p-8 text-center">
                <Loader className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No coupon validations yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Coupon Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Discount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {history.map((coupon) => (
                      <tr key={coupon._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-bold text-purple-600 text-sm">
                          {coupon.couponCode}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <p className="font-semibold text-gray-900">{coupon.studentId.name}</p>
                            <p className="text-xs text-gray-600">{coupon.studentId.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {coupon.discountType === 'percentage'
                            ? `${coupon.discountValue}%`
                            : `₹${coupon.discountValue}`}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(coupon.status)}`}
                          >
                            {coupon.status === 'used' ? '✓ Used' : coupon.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {coupon.status === 'used' && coupon.usedAt
                            ? new Date(coupon.usedAt).toLocaleDateString()
                            : new Date(coupon.purchasedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="font-bold text-purple-900 mb-3">✓ Valid Coupon Signs</h3>
          <ul className="text-sm text-purple-800 space-y-2">
            <li>• Proper alphanumeric format (e.g., ABC123XYZ)</li>
            <li>• Contains student's ID/email</li>
            <li>• Hasn't reached expiration date</li>
            <li>• Not already marked as used</li>
            <li>• Assigned to your vendor account</li>
          </ul>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-bold text-red-900 mb-3">✗ Fraud Prevention</h3>
          <ul className="text-sm text-red-800 space-y-2">
            <li>• System validates all coupons automatically</li>
            <li>• Each code can only be used once</li>
            <li>• Expired codes are rejected</li>
            <li>• Invalid vendor codes are blocked</li>
            <li>• All transactions are logged</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
