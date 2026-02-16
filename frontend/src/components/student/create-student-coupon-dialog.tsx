import { useState } from 'react';
import { X, Loader, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { generateStudentCoupon } from '../../lib/marketplaceAPI';
import { useToast } from '../../hooks/use-toast';

interface Vendor {
  _id: string;
  name: string;
  businessName: string;
}

interface CreateStudentCouponDialogProps {
  vendor: Vendor;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateStudentCouponDialog({
  vendor,
  isOpen,
  onClose,
  onSuccess,
}: CreateStudentCouponDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [description, setDescription] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState<any>(null);

  const handleNext = () => {
    // Validate discount amount
    if (!discountAmount || parseFloat(discountAmount) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid discount amount',
        variant: 'destructive',
      });
      return;
    }

    // Validate payment amount
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    setStep('payment');
  };

  const handlePaymentConfirm = async () => {
    try {
      setLoading(true);

      const paymentAmountNum = parseFloat(paymentAmount);
      const discountAmountNum = parseFloat(discountAmount);

      // Call the backend to generate coupon
      const response = await generateStudentCoupon({
        vendorId: vendor._id,
        amountPaid: paymentAmountNum,
        discount: discountAmountNum,
        discountType,
        description: description || undefined,
      });

      if (response.success) {
        setGeneratedCoupon(response.coupon);
        setStep('success');
        toast({
          title: 'Success!',
          description: 'Your coupon has been created successfully!',
        });

        // Auto-close after 3 seconds
        setTimeout(() => {
          handleClose();
          onSuccess();
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create coupon. Please try again.',
        variant: 'destructive',
      });
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setDiscountAmount('');
    setDiscountType('percentage');
    setDescription('');
    setPaymentAmount('');
    setGeneratedCoupon(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Create Coupon</h2>
            <p className="text-purple-100 text-sm mt-1">{vendor.businessName || vendor.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Form */}
          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 font-semibold mb-2 block">
                  💰 Discount Amount
                </Label>
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="Enter discount amount"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="flex-1"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">₹</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-gray-700 font-semibold mb-2 block">
                  📝 Description (Optional)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g., Get discount on all products"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-gray-700 font-semibold mb-2 block">
                  💳 Payment Amount (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="Enter amount to pay to vendor"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This amount will be paid to the vendor
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-800">
                  <strong>📌 Note:</strong> Once you create this coupon, you'll pay ₹{paymentAmount || '0'} to the vendor.
                </p>
              </div>

              <Button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-lg transition-all"
              >
                Continue to Payment
              </Button>
            </div>
          )}

          {/* Step 2: Payment Confirmation */}
          {step === 'payment' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Discount:</span>
                  <span className="font-semibold text-gray-900">
                    {discountAmount}{discountType === 'percentage' ? '%' : '₹'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Vendor:</span>
                  <span className="font-semibold text-gray-900">{vendor.businessName || vendor.name}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Payment:</span>
                    <span className="text-2xl font-bold text-purple-600">₹{paymentAmount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Important:</strong> You will pay ₹{paymentAmount} to {vendor.businessName || vendor.name} to create this coupon.
                </p>
              </div>

              <Button
                onClick={handlePaymentConfirm}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  '💳 Pay & Create Coupon'
                )}
              </Button>

              <Button
                onClick={() => setStep('form')}
                variant="outline"
                className="w-full"
              >
                ← Back
              </Button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 'success' && generatedCoupon && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-green-500 animate-bounce" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Coupon Created!</h3>
                <p className="text-gray-600 text-sm">Your coupon has been successfully created</p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Coupon Code</p>
                    <p className="text-2xl font-bold text-green-600 font-mono break-all">
                      {generatedCoupon.code}
                    </p>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700 pt-2 border-t border-green-200">
                    <span>Amount Paid:</span>
                    <span className="font-semibold">₹{generatedCoupon.amountPaid}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Redirecting to your coupons in 3 seconds...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
