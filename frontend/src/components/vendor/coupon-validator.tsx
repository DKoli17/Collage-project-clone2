import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Scan, 
  CheckCircle, 
  AlertCircle,
  Search,
  Zap
} from 'lucide-react';

interface CouponValidation {
  couponCode: string;
  studentName?: string;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  status: 'valid' | 'invalid' | 'already_used' | 'expired';
  message: string;
}

export function VendorCouponValidator() {
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [validatedCoupon, setValidatedCoupon] = useState<CouponValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [redemptionNotes, setRedemptionNotes] = useState('');
  const [recentValidations, setRecentValidations] = useState<CouponValidation[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a coupon code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: 'Error',
          description: 'Not authenticated. Please login as vendor.',
          variant: 'destructive',
        });
        return;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/coupon-purchase/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          couponCode: couponCode.toUpperCase(),
          redemptionNotes: redemptionNotes || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const validation: CouponValidation = {
          couponCode: couponCode.toUpperCase(),
          studentName: data.coupon?.studentId?.name,
          discountValue: data.coupon?.discountValue,
          discountType: data.coupon?.discountType,
          status: 'valid',
          message: data.message || 'Coupon validated successfully',
        };

        setValidatedCoupon(validation);
        setRecentValidations([validation, ...recentValidations.slice(0, 4)]);

        toast({
          title: '✅ Coupon Valid',
          description: `Discount: ${
            validation.discountType === 'percentage'
              ? `${validation.discountValue}%`
              : `₹${validation.discountValue}`
          }`,
        });

        // Clear inputs after successful validation
        setCouponCode('');
        setRedemptionNotes('');
        inputRef.current?.focus();
      } else {
        const validation: CouponValidation = {
          couponCode: couponCode.toUpperCase(),
          discountValue: 0,
          discountType: 'percentage',
          status: 'invalid',
          message: data.message || 'Invalid coupon code',
        };

        setValidatedCoupon(validation);

        toast({
          title: '❌ Invalid Coupon',
          description: data.message || 'This coupon code is not valid',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate coupon. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'expired':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'already_used':
        return <AlertCircle className="w-6 h-6 text-orange-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'already_used':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Scan className="w-10 h-10 text-blue-600" />
            Coupon Validator
          </h1>
          <p className="text-gray-600 text-lg">
            Validate student coupon codes and process redemptions
          </p>
        </div>

        {/* Validation Form */}
        <Card className="mb-8 shadow-xl border-t-4 border-t-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Enter Coupon Code
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={validateCoupon} className="space-y-4">
              {/* Coupon Code Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Enter coupon code (e.g., COUPON-ABC123)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-lg font-bold"
                    disabled={loading}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={loading || !couponCode.trim()}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold px-6"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Validate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Redemption Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Redemption Notes (Optional)
                </label>
                <textarea
                  placeholder="Add any notes about this redemption (e.g., payment method, items purchased)"
                  value={redemptionNotes}
                  onChange={(e) => setRedemptionNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  disabled={loading}
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Validation Result */}
        {validatedCoupon && (
          <Card className={`mb-8 shadow-xl border-l-4 ${
            validatedCoupon.status === 'valid' ? 'border-l-green-500' : 'border-l-red-500'
          }`}>
            <CardHeader className={`${
              validatedCoupon.status === 'valid'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50'
                : 'bg-gradient-to-r from-red-50 to-orange-50'
            }`}>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  {getStatusIcon(validatedCoupon.status)}
                  <span>{validatedCoupon.message}</span>
                </CardTitle>
                <Badge className={getStatusColor(validatedCoupon.status)}>
                  {validatedCoupon.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Coupon Code</p>
                  <p className="font-mono font-bold text-lg text-gray-900">
                    {validatedCoupon.couponCode}
                  </p>
                </div>
                {validatedCoupon.status === 'valid' && (
                  <>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600 mb-1">Discount Value</p>
                      <p className="text-2xl font-bold text-green-600">
                        {validatedCoupon.discountType === 'percentage'
                          ? `${validatedCoupon.discountValue}%`
                          : `₹${validatedCoupon.discountValue}`}
                      </p>
                    </div>
                    {validatedCoupon.studentName && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-600 mb-1">Student Name</p>
                        <p className="font-semibold text-gray-900">
                          {validatedCoupon.studentName}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {validatedCoupon.status === 'valid' && (
                <div className="mt-6 p-4 bg-green-100 border-2 border-green-500 rounded-lg text-center">
                  <p className="text-green-900 font-semibold text-lg">✓ Coupon is valid and ready to use</p>
                  <p className="text-green-800 text-sm mt-1">Student has already paid for this discount</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Validations */}
        {recentValidations.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle>Recent Validations</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {recentValidations.map((validation, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-mono font-bold text-gray-900">
                        {validation.couponCode}
                      </p>
                      <p className="text-sm text-gray-600">
                        {validation.discountType === 'percentage'
                          ? `${validation.discountValue}%`
                          : `₹${validation.discountValue}`}{' '}
                        Discount
                      </p>
                    </div>
                    <Badge className={getStatusColor(validation.status)}>
                      {validation.status === 'valid' ? '✓' : '✗'} {validation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Student provides the coupon code</li>
              <li>Enter the code in the field above</li>
              <li>Validate the coupon</li>
              <li>Check the discount amount</li>
              <li>Apply the discount to the student's purchase</li>
              <li>Confirm redemption (coupon automatically marked as used)</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
