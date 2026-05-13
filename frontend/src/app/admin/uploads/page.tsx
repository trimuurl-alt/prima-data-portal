'use client';

import Link from 'next/link';
import { Database, Plus } from 'lucide-react';

export default function UploadsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Upload dataset</h1>
        <p className="text-sm text-stone-500 mt-0.5">Add a new dataset or upload a new version of an existing one</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
        <Database className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <h2 className="text-base font-semibold text-stone-900 mb-1">Manage uploads from the dataset page</h2>
        <p className="text-sm text-stone-500 max-w-md mx-auto mb-4">
          To upload a file, first create or open a dataset. The upload flow is on each dataset&apos;s detail page.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/admin/datasets" className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-100">
            <Database className="w-4 h-4" /> Browse datasets
          </Link>
          <Link href="/admin/datasets" className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
            <Plus className="w-4 h-4" /> Create new dataset
          </Link>
        </div>
      </div>
    </div>
  );
}
