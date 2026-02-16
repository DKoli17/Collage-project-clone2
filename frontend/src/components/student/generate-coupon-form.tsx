import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateStudentCoupon } from '@/lib/marketplaceAPI';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader, CheckCircle, ArrowLeft } from 'lucide-react';

interface LocationState {
  vendorId?: string;
  vendorName?: string;
  offerId?: string;
}

export const GenerateCouponForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const state = (location.state || {}) as LocationState;
  const { vendorId, vendorName } = state;

  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState<any>(null);

  // Redirect if no vendor ID
  useEffect(() => {
    if (!vendorId) {
      toast({
        title: 'Error',
        description: 'Vendor information missing. Please select a vendor.',
        variant: 'destructive',
      });
      navigate('/student/marketplace');
    }
  }, [vendorId, navigate, toast]);

  const handleGenerateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const amount = parseFloat(amountPaid);
    if (!amountPaid || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount greater than 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const response = await generateStudentCoupon({
        vendorId: vendorId!,
        amountPaid: amount,
        offerId: state.offerId,
      });

      if (response.success) {
        setSuccess(true);
        setGeneratedCoupon(response.coupon);
        toast({
          title: 'Success!',
          description: 'Your coupon has been generated successfully!',
        });

        // Auto-redirect to my coupons after 3 seconds
        setTimeout(() => {
          navigate('/student/my-coupons');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error generating coupon:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate coupon. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!vendorId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 pl-0"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {!success ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Generate Coupon</CardTitle>
              <CardDescription>
                Enter the amount you paid at {vendorName || 'the vendor'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  How This Works:
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>Enter the amount you paid directly to the vendor</li>
                  <li>We'll generate a unique coupon code for your payment</li>
                  <li>Your coupon will be valid for 90 days</li>
                  <li>Redeem it anytime through your account</li>
                </ol>
              </div>

              <form onSubmit={handleGenerateCoupon} className="space-y-6">
                {/* Amount Input */}
                <div>
                  <Label htmlFor="amount" className="text-base font-semibold mb-2">
                    Amount Paid (₹)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-xl text-gray-500">₹</span>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter amount paid"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="pl-7 h-12 text-lg"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Please enter the exact amount you paid to the vendor
                  </p>
                </div>

                {/* Vendor Info Display */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Vendor: <span className="font-semibold">{vendorName}</span>
                  </p>
                  {amountPaid && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Coupon Value: <span className="font-semibold">₹{amountPaid}</span>
                    </p>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    ⚠️ Make sure you've already paid the vendor before generating this coupon.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
                  disabled={loading || !amountPaid}
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating Coupon...
                    </>
                  ) : (
                    'Generate Coupon'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          // Success State
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent className="pt-8">
              <div className="text-center space-y-6">
                {/* Success Icon */}
                <div className="flex justify-center">
                  <CheckCircle className="w-16 h-16 text-green-600" />
                </div>

                {/* Success Message */}
                <div>
                  <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                    Coupon Generated!
                  </h2>
                  <p className="text-green-800 dark:text-green-200">
                    Your coupon code has been successfully created.
                  </p>
                </div>

                {/* Coupon Code Display */}
                {generatedCoupon && (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Your Coupon Code
                      </p>
                      <code className="text-2xl font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 p-3 rounded block text-center">
                        {generatedCoupon.code}
                      </code>
                    </div>

                    {/* Coupon Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Amount Paid</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ₹{generatedCoupon.amountPaid}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Status</p>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Expiry Date</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(generatedCoupon.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Validity</p>
                        <p className="font-semibold text-gray-900 dark:text-white">90 Days</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg text-left">
                  <p className="font-semibold text-gray-900 dark:text-white mb-2">
                    What's Next?
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li>✓ Your coupon is now saved to your account</li>
                    <li>✓ You can view it anytime in "My Coupons"</li>
                    <li>✓ Share the code with others if needed</li>
                    <li>✓ It will expire in 90 days</li>
                  </ul>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/student/marketplace')}
                  >
                    Browse More Vendors
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => navigate('/student/my-coupons')}
                  >
                    View My Coupons
                  </Button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Redirecting to My Coupons in 3 seconds...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GenerateCouponForm;
