'use client';

import { useState } from 'react';
import { HelpCircle, Mail, Phone, Clock, X } from 'lucide-react';

export function HelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition"
        aria-label="Help"
      >
        <HelpCircle className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-stone-900/40 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-900">Need help?</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Reach out and we&apos;ll respond as soon as possible.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-600 transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <a
                href="mailto:info@primaresearch.co.za"
                className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 hover:border-brand-300 hover:bg-brand-50/40 transition group"
              >
                <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition">
                  <Mail className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-stone-500 mb-0.5">Email</div>
                  <div className="text-sm font-medium text-stone-900 truncate">
                    info@primaresearch.co.za
                  </div>
                </div>
              </a>

              <a
                href="tel:+27210003755"
                className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 hover:border-brand-300 hover:bg-brand-50/40 transition group"
              >
                <span className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-100 transition">
                  <Phone className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-stone-500 mb-0.5">Phone</div>
                  <div className="text-sm font-medium text-stone-900">+27 21 000 3755</div>
                </div>
              </a>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-stone-50">
                <span className="w-9 h-9 rounded-lg bg-stone-100 text-stone-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-stone-500 mb-0.5">Business hours</div>
                  <div className="text-sm text-stone-900">Mon–Fri 09:00–17:00 SAST</div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-stone-50 border-t border-stone-200">
              <p className="text-[11px] text-stone-500 text-center">
                Primaresearch (Pty) Ltd · Cape Town, South Africa
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
