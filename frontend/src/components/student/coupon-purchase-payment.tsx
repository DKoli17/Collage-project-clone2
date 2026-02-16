import { useState } from 'react';
import { CreditCard, AlertCircle, CheckCircle, Loader, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { purchaseCoupon } from '@/lib/marketplaceAPI';

interface CouponPaymentProps {
  offerId: string;
  vendorName: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  platformPrice: number;
  onSuccess: (coupon: any) => void;
  onCancel: () => void;
}

export const CouponPurchasePayment = ({
  offerId,
  vendorName,
  discount,
  discountType,
  platformPrice,
  onSuccess,
  onCancel,
}: CouponPaymentProps) => {
  const { toast } = useToast();
  
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | ''>('upi');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });
  const [loading, setLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [confirmedPayment, setConfirmedPayment] = useState(false);

  const handlePaymentMethodChange = (method: 'upi' | 'card' | 'netbanking') => {
    setPaymentMethod(method);
  };

  const validatePaymentDetails = () => {
    if (!paymentMethod) {
      toast({
        title: 'Error',
        description: 'Please select a payment method',
        variant: 'destructive',
      });
      return false;
    }

    if (paymentMethod === 'card') {
      if (!cardDetails.cardNumber || cardDetails.cardNumber.length !== 16) {
        toast({
          title: 'Error',
          description: 'Please enter a valid 16-digit card number',
          variant: 'destructive',
        });
        return false;
      }
      if (!cardDetails.cvv || cardDetails.cvv.length !== 3) {
        toast({
          title: 'Error',
          description: 'Please enter a valid 3-digit CVV',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handleProcessPayment = async () => {
    if (!validatePaymentDetails()) return;

    try {
      setPaymentProcessing(true);
      setLoading(true);

      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In production, integrate with actual payment gateway (Razorpay, Stripe, etc.)
      // For now, we'll use the mock payment system

      // Call the backend coupon purchase endpoint
      const response = await purchaseCoupon(offerId, 1);

      if (response.success) {
        setConfirmedPayment(true);
        toast({
          title: 'Success!',
          description: 'Payment completed successfully!',
        });

        // Wait 2 seconds before redirecting
        setTimeout(() => {
          onSuccess(response.purchases?.[0]);
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPaymentProcessing(false);
      setLoading(false);
    }
  };

  if (confirmedPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-green-200 dark:border-green-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
            <CardTitle>Payment Successful!</CardTitle>
            <CardDescription>Your coupon has been generated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Redirecting to your coupons...</p>
              <div className="flex justify-center">
                <Loader className="w-4 h-4 animate-spin text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={onCancel}
          disabled={loading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Payment Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Complete Your Purchase
            </CardTitle>
            <CardDescription className="text-blue-100">
              Pay for your {discountType === 'percentage' ? `${discount}% discount` : `₹${discount} discount`} from {vendorName}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Order Summary */}
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Order Summary</h3>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Vendor:</span>
                <span className="text-gray-900 dark:text-white font-medium">{vendorName}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Discount Value:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {discountType === 'percentage' ? `${discount}%` : `₹${discount}`}
                </span>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">Amount to Pay:</span>
                  <span className="font-bold text-lg text-green-600">₹{platformPrice}</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-900 dark:text-blue-100 mt-3">
                <p className="font-semibold mb-1">💡 How pricing works:</p>
                <p>The original discount value is ₹{discount}, and you're purchasing it at ₹{platformPrice} (platform fee applied).</p>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Select Payment Method</h3>

              <div className="space-y-3">
                {/* UPI Option */}
                <button
                  onClick={() => handlePaymentMethodChange('upi')}
                  className={`w-full p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">UPI</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Google Pay, PhonePe, Paytm</p>
                  </div>
                </button>

                {/* Card Option */}
                <button
                  onClick={() => handlePaymentMethodChange('card')}
                  className={`w-full p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === 'card'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">Debit/Credit Card</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Visa, Mastercard, RuPay</p>
                  </div>
                </button>

                {/* Net Banking Option */}
                <button
                  onClick={() => handlePaymentMethodChange('netbanking')}
                  className={`w-full p-4 border-2 rounded-lg transition-all ${
                    paymentMethod === 'netbanking'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                  }`}
                  disabled={loading}
                >
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">Net Banking</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">All major banks supported</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Card Details (if card selected) */}
            {paymentMethod === 'card' && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white">Card Details</h3>

                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={cardDetails.cardNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setCardDetails({ ...cardDetails, cardNumber: value });
                    }}
                    maxLength={16}
                    disabled={loading}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="cardHolder">Cardholder Name</Label>
                  <Input
                    id="cardHolder"
                    placeholder="John Doe"
                    value={cardDetails.cardHolder}
                    onChange={(e) =>
                      setCardDetails({ ...cardDetails, cardHolder: e.target.value })
                    }
                    disabled={loading}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expiryMonth">MM</Label>
                    <Input
                      id="expiryMonth"
                      placeholder="12"
                      maxLength={2}
                      value={cardDetails.expiryMonth}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                        setCardDetails({ ...cardDetails, expiryMonth: value });
                      }}
                      disabled={loading}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiryYear">YY</Label>
                    <Input
                      id="expiryYear"
                      placeholder="25"
                      maxLength={2}
                      value={cardDetails.expiryYear}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                        setCardDetails({ ...cardDetails, expiryYear: value });
                      }}
                      disabled={loading}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      type="password"
                      maxLength={3}
                      value={cardDetails.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setCardDetails({ ...cardDetails, cvv: value });
                      }}
                      disabled={loading}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>This is a demo. Use any test card details to proceed. Real payment integration coming soon.</p>
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-800 dark:text-green-200">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Your payment is secure and encrypted. We never store sensitive card details.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={loading || paymentProcessing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleProcessPayment}
                disabled={loading || paymentProcessing || !paymentMethod}
              >
                {paymentProcessing ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay ₹{platformPrice}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CouponPurchasePayment;
