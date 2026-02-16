import { Copy, Check, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

interface Coupon {
  id: string;
  code: string;
  brand: string;
  discount: number;
  expiryDate: string;
  status: 'used' | 'unused' | 'expired';
  claimedDate: string;
  usageDate?: string;
}

interface MyCouponsProps {
  coupons: Coupon[];
  onRemove?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

export function MyCoupons({ coupons, onRemove, onViewDetails }: MyCouponsProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'used':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'unused':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'expired':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'used':
        return '✓ Used';
      case 'unused':
        return '🎁 Unused';
      case 'expired':
        return '✕ Expired';
      default:
        return status;
    }
  };

  if (coupons.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <div className="text-4xl mb-4">🎟️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Coupons Yet</h3>
        <p className="text-gray-600">Start claiming discounts to collect coupons!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {coupons.map((coupon) => (
        <div
          key={coupon.id}
          className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition-shadow"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Coupon Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold text-gray-900">{coupon.brand}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(coupon.status)}`}>
                  {getStatusLabel(coupon.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                <div>
                  <p className="text-gray-600">Discount</p>
                  <p className="font-bold text-gray-900">{coupon.discount}% Off</p>
                </div>
                <div>
                  <p className="text-gray-600">Code</p>
                  <p className="font-mono font-bold text-purple-600">{coupon.code}</p>
                </div>
                <div>
                  <p className="text-gray-600">Claimed</p>
                  <p className="text-gray-900">{coupon.claimedDate}</p>
                </div>
                <div>
                  <p className="text-gray-600">Expires</p>
                  <p className="text-gray-900">{coupon.expiryDate}</p>
                </div>
              </div>

              {coupon.usageDate && coupon.status === 'used' && (
                <p className="text-xs text-gray-500 mt-2">Used on: {coupon.usageDate}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col md:flex-row gap-2">
              <Button
                onClick={() => handleCopyCode(coupon.code)}
                variant="outline"
                className="flex items-center justify-center gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                {copiedCode === coupon.code ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>

              <Button
                onClick={() => onViewDetails?.(coupon.id)}
                variant="outline"
                className="flex items-center justify-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                Details
              </Button>

              {coupon.status !== 'expired' && (
                <Button
                  onClick={() => onRemove?.(coupon.id)}
                  variant="outline"
                  className="flex items-center justify-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
