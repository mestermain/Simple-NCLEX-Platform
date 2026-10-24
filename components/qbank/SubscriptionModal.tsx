'use client';

import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  PhoneCall, 
  CreditCard, 
  Clock, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { siteConfig } from '@/lib/siteConfig';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialPlan?: '1m' | '3m' | '6m';
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
  initialPlan = '1m',
}: SubscriptionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'1m' | '3m' | '6m'>(initialPlan);
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const planDetails = {
    '1m': { id: 1, name: '1-Month Intensive Pass', days: 30, price: 4999 },
    '3m': { id: 2, name: '3-Month High-Yield Master', days: 90, price: 7999 },
    '6m': { id: 3, name: '6-Month Complete Pass', days: 180, price: 11999 },
  };

  // Instant 1-Click Free Trial / Demo Pass Activation
  const handleInstantActivate = async () => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const activePlan = planDetails[selectedPlan];
      const res = await fetch('/api/qbank/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activePlan.id,
          planName: activePlan.name,
          durationDays: activePlan.days,
          price: 0,
          instantActivate: true,
          notes: 'Candidate activated instant access pass',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Full Q-Bank access successfully activated!');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        }
      } else {
        setErrorMsg(data.message || 'Failed to activate access. Please make sure you are signed in.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit manual bank transfer / proof
  const handleSubmitPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const activePlan = planDetails[selectedPlan];
      let base64Screenshot = '';

      if (screenshotFile) {
        const reader = new FileReader();
        base64Screenshot = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(screenshotFile);
        });
      }

      const res = await fetch('/api/qbank/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: activePlan.id,
          planName: activePlan.name,
          durationDays: activePlan.days,
          price: activePlan.price,
          whatsappNumber: whatsapp.trim(),
          paymentScreenshot: base64Screenshot,
          notes: notes.trim(),
          instantActivate: true, // Auto-activate in development/demo mode
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Subscription registered successfully! Access is active.');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        }
      } else {
        setErrorMsg(data.message || 'Error submitting subscription.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Q-Bank Access Pass</h3>
              <p className="text-xs text-slate-500">Unlock all 3,500+ questions, case studies & CAT tests</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        {!successMsg && (
          <div className="mt-5 space-y-6">
            {/* Plan Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Select Your Plan
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: '1m', name: '1 Month', days: '30 Days', price: 'Rs. 4,999' },
                  { id: '3m', name: '3 Months', days: '90 Days', price: 'Rs. 7,999', popular: true },
                  { id: '6m', name: '6 Months', days: '180 Days', price: 'Rs. 11,999' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlan(p.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all relative cursor-pointer ${
                      selectedPlan === p.id
                        ? 'border-sky-600 bg-sky-50/80 ring-2 ring-sky-500/20 text-sky-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-xs">
                        Most Popular
                      </span>
                    )}
                    <div className="text-xs sm:text-sm font-extrabold">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.days}</div>
                    <div className="text-xs font-bold text-sky-700 mt-1">{p.price}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Instant Activation Shortcut */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 via-indigo-50 to-slate-50 border border-sky-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                <Zap className="w-4 h-4 text-sky-600 fill-current" />
                <span>Instant Candidate Activation (Recommended)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Start your mock tests immediately without waiting for payment review.
              </p>
              <button
                type="button"
                onClick={handleInstantActivate}
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{submitting ? 'Activating Access...' : 'Activate 30-Day All-Access Pass Now'}</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
                or bank transfer
              </span>
            </div>

            {/* Payment Details */}
            <form onSubmit={handleSubmitPaid} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                  <span>Direct Bank / Wallet Accounts:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="font-semibold text-slate-600">Meezan Bank:</span>
                    <p className="font-mono text-slate-800">{siteConfig.banking.iban || 'PK42MEZN0001020304050607'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600">Easypaisa / JazzCash:</span>
                    <p className="font-mono text-slate-800">{siteConfig.banking.easypaisaNumber || '0300-1234567'}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Your WhatsApp Number
                </label>
                <input
                  type="text"
                  placeholder="+92 300 1234567"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Payment Receipt / Screenshot (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Submit Subscription Verification</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="pt-2 text-center">
              <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Encrypted transmission · Instant activation supported</span>
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
