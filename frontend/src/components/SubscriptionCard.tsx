// src/components/SubscriptionCard.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock } from 'lucide-react';
import Swal from 'sweetalert2';

interface Props {
  plan: {
    plan_id: number;
    name: string;
    price_monthly: number;
    price_yearly: number;
    features: any;
  };
  currentSubscription?: {
    plan_id: number;
    expiry_date: string;
    status: string;
    start_date?: string;
  };
  onRenew: (planId: number) => void;
  onUpgrade: (planId: number) => void;
  isRecommended?: boolean;
}

const badgeColors: Record<string, string> = {
  trial: 'bg-teal-500',
  basic: 'bg-amber-500',
  pro: 'bg-yellow-500',
};

export const SubscriptionCard: React.FC<Props> = ({ plan, currentSubscription, onRenew, onUpgrade, isRecommended }) => {
  const isCurrent = currentSubscription?.plan_id === plan.plan_id;
  const daysRemaining = currentSubscription
    ? Math.max(0, Math.ceil((new Date(currentSubscription.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const expired = currentSubscription && currentSubscription.status === 'expired';

  const progress = daysRemaining && currentSubscription?.expiry_date
    ? Math.min(100, Math.max(0, Math.round(((new Date(currentSubscription.expiry_date).getTime() - Date.now()) / (new Date(currentSubscription.expiry_date).getTime() - new Date(currentSubscription.start_date ?? Date.now()).getTime())) * 100)))
    : 0;

  const cardClasses = `bg-gray-900/70 backdrop-blur-xl rounded-xl border border-gray-800 p-6 shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 ${isRecommended ? 'border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]' : ''}`;

  const showBenefits = () => {
    const featureList = Object.entries(plan.features || {})
      .map(([key, val]) => {
        const formattedKey = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const formattedVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val;
        return `<li style="margin-bottom: 8px; font-size: 13px; color: #4b5563;"><strong>${formattedKey}:</strong> ${formattedVal}</li>`;
      })
      .join('');

    Swal.fire({
      title: `${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} Plan Features`,
      html: `
        <div style="text-align: left; padding: 10px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <p style="margin-bottom: 12px; font-weight: bold; color: #111827;">Included System Privileges:</p>
          <ul style="list-style-type: disc; margin-left: 20px; padding-left: 5px;">
            ${featureList || '<li>No specific features listed.</li>'}
          </ul>
        </div>
      `,
      confirmButtonText: 'Great!',
      confirmButtonColor: '#FF5A1F',
    });
  };

  const showBillingHistory = () => {
    if (!isCurrent) {
      Swal.fire({
        title: 'Billing Access',
        text: 'You can only view billing history for your active subscription plan.',
        icon: 'warning',
        confirmButtonColor: '#FF5A1F',
      });
      return;
    }

    if (plan.name.toLowerCase() === 'trial') {
      Swal.fire({
        title: 'No Billing Transactions',
        text: 'Your hotel is currently on a Free Trial. No payments have occurred.',
        icon: 'info',
        confirmButtonColor: '#FF5A1F',
      });
      return;
    }

    Swal.fire({
      title: 'Subscription Ledger',
      html: `
        <div style="text-align: left; font-size: 13px; background: #f9fafb; padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb; font-weight: bold; color: #374151;">
                <th style="padding: 8px 0; text-align: left;">Billing Date</th>
                <th style="padding: 8px 0; text-align: left;">Scope</th>
                <th style="padding: 8px 0; text-align: right;">Amount Charged</th>
              </tr>
            </thead>
            <tbody>
              <tr style="color: #4b5563;">
                <td style="padding: 8px 0;">${new Date(currentSubscription?.start_date ?? Date.now()).toLocaleDateString()}</td>
                <td style="padding: 8px 0; font-weight: 500;">${plan.name.toUpperCase()} Monthly</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981;">₹${plan.price_monthly}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `,
      confirmButtonColor: '#FF5A1F',
    });
  };

  const downloadInvoice = () => {
    if (!isCurrent) {
      Swal.fire({
        title: 'Invoice Access',
        text: 'You can only retrieve invoices for your active subscription plan.',
        icon: 'warning',
        confirmButtonColor: '#FF5A1F',
      });
      return;
    }

    if (plan.name.toLowerCase() === 'trial') {
      Swal.fire({
        title: 'Invoice Unavailable',
        text: 'No invoices are generated for Free Trial accounts.',
        icon: 'info',
        confirmButtonColor: '#FF5A1F',
      });
      return;
    }

    Swal.fire({
      title: 'Compiling Invoice 📄',
      text: 'Creating secure PDF transaction summary...',
      timer: 1500,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    }).then(() => {
      Swal.fire({
        title: 'Invoice Downloaded',
        text: `Your billing statement for the ${plan.name.toUpperCase()} tier (amounting to ₹${plan.price_monthly}) was downloaded successfully in Sandbox mode.`,
        icon: 'success',
        confirmButtonColor: '#FF5A1F',
      });
    });
  };

  return (
    <div className={cardClasses}>
      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${badgeColors[plan.name.toLowerCase()] || 'bg-gray-600'}`}>
        {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}
      </div>
      <h2 className="text-xl font-semibold mt-2 mb-1 text-white">{plan.name}</h2>
      <p className="text-sm text-gray-400 mb-3">
        {plan.price_monthly === 0 ? 'Free Trial' : `₹${plan.price_monthly}/mo`}
      </p>
      {isCurrent && currentSubscription && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="text-green-400 w-4 h-4" />
            <span className="text-green-400">Active</span>
          </div>
          <div className="flex items-center space-x-2 text-sm mt-1">
            <Clock className="text-yellow-400 w-4 h-4" />
            <span>{daysRemaining} days remaining</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 mt-4">
        {isCurrent && !expired ? (
          <Button
            variant="outline"
            disabled={expired}
            onClick={() => onRenew(plan.plan_id)}
            className={`text-white border-gray-700 bg-transparent hover:bg-gray-800 ${expired ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Renew Membership
          </Button>
        ) : (
          <Button variant="default" onClick={() => onUpgrade(plan.plan_id)} className="bg-orange-500 text-white hover:bg-orange-600">
            Upgrade to {plan.name}
          </Button>
        )}
        <Button variant="ghost" onClick={showBenefits} className="text-gray-400 hover:text-white hover:bg-gray-800">
          View Benefits
        </Button>
        <Button variant="ghost" onClick={showBillingHistory} className="text-gray-400 hover:text-white hover:bg-gray-800">Billing History</Button>
        <Button variant="ghost" onClick={downloadInvoice} className="text-gray-400 hover:text-white hover:bg-gray-800">Download Invoice</Button>
      </div>
    </div>
  );
};

export default SubscriptionCard;
