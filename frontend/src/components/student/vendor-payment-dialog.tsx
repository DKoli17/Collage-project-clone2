import { useState } from 'react';
import { X, AlertCircle, CheckCircle, Loader, CreditCard } from 'lucide-react';
import { generateStudentCoupon } from '../../lib/marketplaceAPI';

interface Coupon {
  _id: string;
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  description?: string;
}

interface Vendor {
  _id: string;
  businessName: string;
  email?: string;
}

interface VendorPaymentDialogProps {
  vendor: Vendor | null;
  coupon: Coupon | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (coupon: any) => void;
}

type PaymentMethod = 'card' | 'upi' | 'netbanking' | '';

export function VendorPaymentDialog({
  vendor,
  coupon,
  isOpen,
  onClose,
  onSuccess,
}: VendorPaymentDialogProps) {
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState<any>(null);

  if (!isOpen || !vendor || !coupon) return null;

  const handleClose = () => {
    setAmountPaid('');
    setPaymentMethod('upi');
    setError('');
    setSuccess(false);
    setGeneratedCoupon(null);
    onClose();
  };

  const handlePayment = async () => {
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Process payment (in real scenario, integrate with payment gateway)
      // TODO: Integrate with actual payment gateway (Stripe, Razorpay, etc.)

      // Generate coupon after successful payment
      const response = await generateStudentCoupon({
        vendorId: vendor._id,
        amountPaid: parseFloat(amountPaid),
        offerId: coupon._id,
      });

      if (response.success) {
        setGeneratedCoupon(response.coupon);
        setSuccess(true);
        // Auto close after 3 seconds
        setTimeout(() => {
          onSuccess(response.coupon);
          handleClose();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Pay to {vendor.businessName}</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Your coupon has been generated:
                </p>
                <div className="bg-white rounded p-3 border border-green-200">
                  <p className="font-mono text-lg font-bold text-green-600">
                    {generatedCoupon?.code}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Discount: {generatedCoupon?.discount}
                    {generatedCoupon?.discountType === 'percentage' ? '%' : '₹'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Check "My Coupons" to view all your generated coupons
              </p>
            </div>
          ) : (
            <>
              {/* Coupon Summary */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">Coupon Details</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Code:</span> {coupon.code}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Discount:</span>{' '}
                    {coupon.discount}
                    {coupon.discountType === 'percentage' ? '%' : '₹'}
                  </p>
                  {coupon.description && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Description:</span> {coupon.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex gap-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Pay (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'upi', label: '📱 UPI' },
                    { value: 'card', label: '💳 Credit/Debit Card' },
                    { value: 'netbanking', label: '🏦 Net Banking' },
                  ].map((method) => (
                    <label
                      key={method.value}
                      className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value as PaymentMethod)
                        }
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        {method.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={handlePayment}
                disabled={loading || !amountPaid || !paymentMethod}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Pay ₹{amountPaid || '0'} & Get Coupon
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center mt-4">
                By proceeding, you agree to pay directly to {vendor.businessName} and receive
                the coupon immediately
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
