import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../lib/api';
import { useRealtimeStudentCoupons } from '../../hooks/useRealtimeStudentCoupons';

interface Offer {
  _id: string;
  title: string;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  platformSellingPrice: number;
  vendor: {
    _id: string;
    name: string;
    businessName: string;
  };
}

interface PurchaseDialogProps {
  offer: Offer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (purchase: any) => void;
}

type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet' | '';

export function CouponPurchaseDialog({ offer, isOpen, onClose, onSuccess }: PurchaseDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [purchaseData, setPurchaseData] = useState<any>(null);

  // Real-time coupon updates
  useRealtimeStudentCoupons(
    (purchase) => {
      console.log('🎉 Real-time purchase success received:', purchase);
      // This will be triggered by real-time socket event
      if (purchase.purchases && purchase.purchases.length > 0) {
        setPurchaseData(purchase);
        setSuccess(true);
        // Delay closing to show success message
        setTimeout(() => {
          onSuccess(purchase);
          handleClose();
        }, 3000);
      }
    },
    undefined,
    undefined,
    () => {
      // Socket connection status - used for monitoring
    }
  );

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setQuantity(1);
      setPaymentMethod('upi');
      setError('');
      setSuccess(false);
      setPurchaseData(null);
    }
  }, [isOpen]);

  if (!isOpen || !offer) return null;

  const totalPrice = (offer.platformSellingPrice || 0) * quantity;
  const originalTotalValue = offer.discount * quantity;
  const savings = originalTotalValue - totalPrice;

  const handlePurchase = async () => {
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // In a real application, you would integrate with a payment gateway here
      // For now, we'll simulate payment processing
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const response = await api.post('/coupon-purchase/buy', {
        offerId: offer._id,
        quantity,
        transactionId,
        paymentMethod,
      });

      setPurchaseData(response.data);
      setSuccess(true);

      // Call success callback after 2 seconds
      setTimeout(() => {
        onSuccess(response.data);
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to purchase coupon. Please try again.');
      console.error('Purchase error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuantity(1);
    setPaymentMethod('upi');
    setError('');
    setSuccess(false);
    setPurchaseData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Purchase Coupon</h2>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success State */}
        {success && purchaseData ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Purchase Successful!</h3>
            <p className="text-gray-600 mb-6">Your coupon codes have been generated and saved to your account.</p>

            {/* Coupon Preview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs text-gray-600 font-semibold mb-2">COUPON CODE</p>
              {purchaseData && purchaseData.purchases && purchaseData.purchases.length > 0 && (
                <div className="space-y-2">
                  {purchaseData.purchases.map((p: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-white p-3 rounded border-2 border-dashed border-purple-500"
                    >
                      <code className="font-mono font-bold text-purple-600 text-sm">{p.couponCode}</code>
                      <p className="text-xs text-gray-600 mt-1">Expires: {new Date(p.expiryDate).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Summary */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold mb-2">TRANSACTION DETAILS</p>
              <div className="text-sm text-gray-700">
                <p className="flex justify-between mb-1">
                  <span>Total Paid:</span>
                  <span className="font-bold">₹{purchaseData?.totalPrice}</span>
                </p>
                <p className="text-xs text-green-600">You saved ₹{originalTotalValue - (purchaseData?.totalPrice || 0)}!</p>
              </div>
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-2 rounded-lg"
            >
              View My Coupons
            </Button>
          </div>
        ) : (
          <div className="p-6">
            {/* Offer Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 mb-6 border border-purple-200">
              <h3 className="font-bold text-gray-900 mb-1">{offer.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{offer.vendor.businessName}</p>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-600">Discount</p>
                  <p className="font-bold text-lg text-purple-600">
                    {offer.discountType === 'percentage' ? `${offer.discount}%` : `₹${offer.discount}`}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Price per Coupon</p>
                  <p className="font-bold text-lg text-green-600">₹{offer.platformSellingPrice}</p>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                How many coupons do you want?
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 font-semibold"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-16 text-center py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 border border-gray-300 rounded-lg font-semibold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Unit Price:</span>
                <span>₹{offer.platformSellingPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span>{quantity}</span>
              </div>
              <div className="flex justify-between text-green-600 text-xs">
                <span>You Save ({offer.discountType === 'percentage' ? `${offer.discount}%` : 'off'}):</span>
                <span>−₹{savings}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-purple-600">₹{totalPrice}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Select Payment Method
              </label>
              <div className="space-y-2">
                {[
                  { value: 'upi', label: '📱 UPI' },
                  { value: 'card', label: '💳 Credit/Debit Card' },
                  { value: 'netbanking', label: '🏦 Net Banking' },
                  { value: 'wallet', label: '👛 Digital Wallet' },
                ].map((method) => (
                  <label key={method.value} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-4 h-4 text-purple-500"
                    />
                    <span className="flex-1 font-medium text-gray-700">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={loading || !paymentMethod}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                {loading ? 'Processing...' : `Pay ₹${totalPrice}`}
              </Button>
            </div>

            {/* Info Note */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Your payment is secure and encrypted. Coupon codes will be instantly available after payment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
