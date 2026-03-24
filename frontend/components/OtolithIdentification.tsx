'use client';

import { useMemo, useState } from 'react';
import { Upload, Fish, AlertCircle } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type PredictionResult = {
  species: string;
  confidence: number;
  taxonomy: {
    kingdom?: string | null;
    phylum?: string | null;
    class?: string | null;
    order?: string | null;
    family?: string | null;
    genus?: string | null;
    common_name?: string | null;
    description?: string | null;
  } | null;
};

export default function OtolithIdentification() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  const onPredict = async () => {
    if (!file) {
      setError('Please upload an otolith image first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE}/api/otolith/predict`, {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Prediction failed');
      }

      setResult(payload);
    } catch (e: any) {
      setError(e.message || 'Prediction failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-cyan-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-cyan-100 p-2 text-cyan-700">
          <Fish className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Otolith Identification</h2>
          <p className="text-sm text-gray-500">Upload an otolith image to predict species and view taxonomy.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-dashed border-gray-300 p-4">
          <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
            <Upload className="h-4 w-4" />
            <span>Choose Otolith Image</span>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
                setResult(null);
                setError(null);
              }}
            />
          </label>

          <button
            onClick={onPredict}
            disabled={loading || !file}
            className="w-full rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Predicting...' : 'Identify Species'}
          </button>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          {preview ? (
            <img src={preview} alt="Otolith preview" className="h-52 w-full rounded-lg object-cover" />
          ) : (
            <div className="flex h-52 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
              Image preview
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold text-emerald-900 italic">{result.species}</p>
            <p className="text-sm font-medium text-emerald-700">Confidence: {(result.confidence * 100).toFixed(2)}%</p>
          </div>

          {result.taxonomy && (
            <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
              <p><span className="font-semibold">Kingdom:</span> {result.taxonomy.kingdom || 'NA'}</p>
              <p><span className="font-semibold">Phylum:</span> {result.taxonomy.phylum || 'NA'}</p>
              <p><span className="font-semibold">Class:</span> {result.taxonomy.class || 'NA'}</p>
              <p><span className="font-semibold">Order:</span> {result.taxonomy.order || 'NA'}</p>
              <p><span className="font-semibold">Family:</span> {result.taxonomy.family || 'NA'}</p>
              <p><span className="font-semibold">Genus:</span> {result.taxonomy.genus || 'NA'}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
