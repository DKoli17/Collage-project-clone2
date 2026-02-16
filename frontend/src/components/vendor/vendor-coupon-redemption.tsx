import { useState } from 'react';
import { Ticket, CheckCircle2, AlertCircle, Loader, Copy, User, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { redeemCoupon } from '@/lib/marketplaceAPI';

interface RedemptionResult {
  success: boolean;
  coupon: {
    couponCode: string;
    studentName: string;
    studentEmail: string;
    discountValue: number;
    discountType: 'percentage' | 'fixed';
    discountLabel: string;
    offerTitle: string;
    status: string;
    usedAt: string;
  };
  message: string;
}

export const VendorCouponRedemption = () => {
  const { toast } = useToast();

  const [step, setStep] = useState<'input' | 'confirmation' | 'complete'>('input');
  const [couponCode, setCouponCode] = useState('');
  const [redemptionNotes, setRedemptionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RedemptionResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleRedeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    try {
      setLoading(true);
      const response = await redeemCoupon(couponCode.toUpperCase().trim(), redemptionNotes);

      if (response.success) {
        setResult(response);
        setStep('confirmation');

        toast({
          title: 'Coupon Validated!',
          description: `Coupon redeemed successfully for ${response.coupon.studentName}`,
        });
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to validate coupon';
      setError(errorMsg);
      toast({
        title: 'Validation Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyStudentName = async (name: string) => {
    await navigator.clipboard.writeText(name);
    toast({
      title: 'Copied!',
      description: 'Student name copied to clipboard',
    });
  };

  const handleComplete = () => {
    setCouponCode('');
    setRedemptionNotes('');
    setResult(null);
    setStep('input');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Coupon Redemption
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Validate and claim student coupons at your store
          </p>
        </div>

        {/* Input Step */}
        {step === 'input' && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Enter Coupon Code
              </CardTitle>
              <CardDescription className="text-purple-100">
                Ask the customer for their coupon code and verify it here
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleRedeemCoupon} className="space-y-4">
                <div>
                  <Label htmlFor="couponCode" className="text-base font-semibold">
                    Coupon Code
                  </Label>
                  <Input
                    id="couponCode"
                    placeholder="e.g., CPN123XYZ456"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                    disabled={loading}
                    className="mt-2 text-lg font-mono tracking-widest"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter the 12-15 character coupon code
                  </p>
                </div>

                <div>
                  <Label htmlFor="redemptionNotes" className="text-base font-semibold">
                    Notes (Optional)
                  </Label>
                  <Textarea
                    id="redemptionNotes"
                    placeholder="Add any notes about the redemption (e.g., item purchased, amount paid)"
                    value={redemptionNotes}
                    onChange={(e) => setRedemptionNotes(e.target.value)}
                    disabled={loading}
                    className="mt-2 resize-none"
                    rows={3}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 dark:text-red-100">Validation Failed</p>
                      <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    disabled={loading || !couponCode.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Validate Coupon
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Tips */}
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">💡 Tips for Redemption:</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <li>✓ Ask customer for the coupon code from their account</li>
                  <li>✓ Each coupon can only be redeemed once</li>
                  <li>✓ Check expiry date before redeeming</li>
                  <li>✓ Add notes for your records</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Step */}
        {step === 'confirmation' && result && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Coupon Validated Successfully
              </CardTitle>
              <CardDescription className="text-green-100">
                Confirmation details for {result.coupon.studentName}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Coupon Details */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-center mb-6">
                    <Badge className="bg-green-600">Active & Valid</Badge>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">
                      {result.coupon.discountLabel}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{result.coupon.offerTitle}</p>
                  </div>

                  {/* Coupon Code */}
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg mb-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Coupon Code
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                        {result.coupon.couponCode}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(result.coupon.couponCode);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                        {copiedCode ? 'Copied' : ''}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Student Information */}
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Student Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Name</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {result.coupon.studentName}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyStudentName(result.coupon.studentName)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {result.coupon.studentEmail}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Redemption Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Redemption Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Redeemed At:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {new Date(result.coupon.usedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <Badge className="bg-green-600">{result.coupon.status.toUpperCase()}</Badge>
                    </div>
                    {redemptionNotes && (
                      <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Notes:</p>
                        <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 p-2 rounded">
                          {redemptionNotes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Success Message */}
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">Coupon Redeemed!</p>
                    <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                      The discount has been applied. Please proceed with the payment.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-gray-200 text-gray-900 hover:bg-gray-300"
                    onClick={handleComplete}
                  >
                    Redeem Another
                  </Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleComplete}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VendorCouponRedemption;
