import React from 'react';
import { PackagePlus } from 'lucide-react';

export default function LokalvardNyttUttag() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Nytt uttag – Lokalvård</h1>
          <p className="text-gray-500 mt-1">Skapa ett nytt uttag av lokalvårdsartiklar</p>
        </div>
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <div className="text-center text-gray-400">
            <PackagePlus className="w-12 h-12 mx-auto mb-3" />
            <p className="text-lg font-medium">Nytt uttag</p>
            <p className="text-sm">Sidan är under konstruktion</p>
          </div>
        </div>
      </div>
    </div>
  );
}