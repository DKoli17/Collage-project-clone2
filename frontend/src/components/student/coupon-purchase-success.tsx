import { CheckCircle, Copy, Download, Share2 } from 'lucide-react';
import { Button } from '../ui/button';

interface CouponCode {
  _id: string;
  couponCode: string;
  status: string;
  expiryDate: Date;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  platformSellingPrice: number;
}

interface CouponPurchaseSuccessProps {
  offer: {
    title: string;
    description: string;
    vendor: {
      name: string;
      businessName: string;
    };
    discount: number;
    discountType: 'percentage' | 'fixed';
  };
  purchases: CouponCode[];
  totalPrice: number;
  totalQuantity: number;
  onClose: () => void;
  onViewCoupons?: () => void;
}

export function CouponPurchaseSuccess({
  offer,
  purchases,
  totalPrice,
  totalQuantity,
  onClose,
  onViewCoupons,
}: CouponPurchaseSuccessProps) {
  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // Show toast notification
    alert('Copied to clipboard: ' + code);
  };

  const getDiscountLabel = (discount: number, type: string) => {
    return type === 'percentage' ? `${discount}%` : `₹${discount}`;
  };

  const savings = (offer.discount - (totalPrice / totalQuantity)) * totalQuantity;

  return (
    <div className="w-full max-w-2xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 animate-pulse" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🎉 Purchase Successful!</h1>
        <p className="text-gray-600">Your {totalQuantity} coupon code(s) have been generated and are ready to use</p>
      </div>

      {/* Offer Summary */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border border-purple-200">
        <h2 className="font-bold text-lg text-gray-900 mb-2">{offer.title}</h2>
        <p className="text-gray-600 text-sm mb-4">{offer.description}</p>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">VENDOR</p>
            <p className="font-semibold text-gray-900">{offer.vendor.businessName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">DISCOUNT</p>
            <p className="font-bold text-xl text-purple-600">
              {getDiscountLabel(offer.discount, offer.discountType)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">QUANTITY</p>
            <p className="font-bold text-xl text-blue-600">{totalQuantity}</p>
          </div>
        </div>
      </div>

      {/* Coupon Codes */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-4">📋 Your Coupon Codes</h3>
        <div className="space-y-3">
          {purchases.map((purchase, index) => (
            <div
              key={purchase._id}
              className="bg-white border-2 border-dashed border-purple-500 rounded-lg p-4 hover:bg-purple-50 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-2">COUPON #{index + 1}</p>
                  <code className="font-mono font-bold text-purple-600 text-base tracking-wider break-all">
                    {purchase.couponCode}
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    Expires: {new Date(purchase.expiryDate).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => copyCouponCode(purchase.couponCode)}
                  className="p-2 hover:bg-purple-100 rounded-lg transition text-purple-600"
                  title="Copy coupon code"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-6 border border-green-200">
        <h3 className="font-bold text-gray-900 mb-4">💰 Transaction Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Original Value:</span>
            <span className="font-semibold">₹{offer.discount * totalQuantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">You Paid:</span>
            <span className="font-semibold">₹{totalPrice}</span>
          </div>
          <div className="border-t pt-3 flex justify-between text-green-600 font-bold">
            <span>You Saved:</span>
            <span className="text-lg">₹{Math.round(savings)}</span>
          </div>
        </div>
      </div>

      {/* How to Use */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
        <h3 className="font-bold text-gray-900 mb-3">📖 How to Use Your Coupon</h3>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">1</span>
            <span>Visit {offer.vendor.businessName} location or their website</span>
          </li>
          <li className="flex gap-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">2</span>
            <span>Show this coupon code when making a purchase</span>
          </li>
          <li className="flex gap-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">3</span>
            <span>Get your {getDiscountLabel(offer.discount, offer.discountType)} discount applied</span>
          </li>
          <li className="flex gap-3">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">4</span>
            <span>Coupon will be marked as used in your account</span>
          </li>
        </ol>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 rounded-lg p-4 mb-6 border border-yellow-200 text-sm text-yellow-800">
        <p className="font-semibold mb-2">⚠️ Important Notes:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Each coupon can be used only once</li>
          <li>Coupon is valid until the expiry date shown above</li>
          <li>Save your coupon codes in a safe place or screenshot them</li>
          <li>For terms and conditions, visit the vendor's website</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onClose}
          className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
        >
          Done
        </Button>
        <Button
          onClick={onViewCoupons}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          View My Coupons
        </Button>
      </div>

      {/* Share Option */}
      <button
        className="w-full mt-4 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold flex items-center justify-center gap-2 transition"
        title="Share your purchase (coming soon)"
        disabled
      >
        <Share2 className="w-4 h-4" />
        Share This Offer (Coming Soon)
      </button>
    </div>
  );
}
