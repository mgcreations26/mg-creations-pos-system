/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Image as ImageIcon, Download, Copy, RefreshCw, Layers } from 'lucide-react';

interface ImageDesignerProps {
  onAddProductWithImage?: (imageUrl: string) => void;
}

export default function ImageDesigner({ onAddProductWithImage }: ImageDesignerProps) {
  const [prompt, setPrompt] = useState('minimalist line-art wildflower illustration for a ceramic coffee mug, pastel tones, clean white background, craft aesthetics');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setGeneratedUrl(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.imageUrl) {
        setGeneratedUrl(data.imageUrl);
      } else {
        throw new Error('No image was returned from the generator.');
      }
    } catch (err: any) {
      console.error('Image designer error:', err);
      setError(err?.message || 'Failed to communicate with image model. Confirm your GEMINI_API_KEY is configured.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    alert('Base64 image data copied to clipboard!');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      
      {/* Left panel: Prompt & parameters */}
      <div className="md:col-span-5 bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-5">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h4 className="text-base font-extrabold text-gray-800">AI Graphic Mockup Studio</h4>
        </div>
        <p className="text-xs text-gray-400 font-medium leading-relaxed">
          Need custom art elements, printable vinyl stickers, or mug decal graphics? Describe what you want and let our AI graphic model draft high-resolution illustrations.
        </p>

        <div className="space-y-4 text-xs font-semibold text-gray-500">
          <div className="space-y-1.5">
            <label className="font-bold text-gray-500">Graphic Illustration Description</label>
            <textarea
              rows={4}
              placeholder="e.g. cute watercolor garden gnome holding a watering can, handpainted style..."
              className="w-full text-xs py-2.5 border border-gray-200 rounded-2xl px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50/30"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-gray-500">Canvas Dimension Ratio</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { ratio: '1:1', label: 'Square (1:1)' },
                { ratio: '3:4', label: 'Portrait (3:4)' },
                { ratio: '4:3', label: 'Landscape (4:3)' }
              ].map(item => (
                <button
                  key={item.ratio}
                  onClick={() => setAspectRatio(item.ratio)}
                  className={`py-2 text-[10px] font-bold rounded-xl transition-all border ${
                    aspectRatio === item.ratio 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-55 flex items-center justify-center space-x-2 cursor-pointer shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Creating Visual Art Asset...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Graphic Elements</span>
              </>
            )}
          </button>
        </div>

        {/* Art Tips box */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-[11px] text-amber-800 leading-relaxed font-medium">
          <span className="font-bold">💡 Pro Craft Tip:</span> Include tags like "isolated vector white background", "clean flat lineart icon", or "watercolor texture" to generate high-fidelity elements suitable for mugs or vinyl plotting.
        </div>
      </div>

      {/* Right panel: Live output display */}
      <div className="md:col-span-7 bg-white border border-gray-100 rounded-3xl p-5 shadow-xs min-h-[440px] flex flex-col justify-between items-center relative">
        <div className="w-full flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Asset Output</h5>
          {generatedUrl && (
            <div className="flex space-x-2">
              <button
                onClick={copyToClipboard}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl transition-all"
                title="Copy Base64 Data URL"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={generatedUrl}
                download="mg_creation_asset.png"
                className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl transition-all"
                title="Download PNG image"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Image / Empty Canvas */}
        <div className="flex-1 w-full flex flex-col items-center justify-center bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-6 min-h-[300px]">
          {loading ? (
            <div className="text-center space-y-3">
              <div className="relative mx-auto w-12 h-12">
                <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-ping"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-xs text-indigo-600 font-extrabold">Gemini image-gen rendering vectors...</p>
              <p className="text-[10px] text-gray-400">Usually completes in 3-5 seconds</p>
            </div>
          ) : generatedUrl ? (
            <img
              src={generatedUrl}
              alt="Generated Craft design illustration mockup"
              className="max-h-[320px] max-w-full object-contain rounded-xl shadow-lg border border-gray-100 bg-white"
            />
          ) : error ? (
            <div className="text-center text-rose-500 text-xs font-medium space-y-1 max-w-sm">
              <p className="font-extrabold">Generation Failed</p>
              <p className="text-gray-400 leading-relaxed text-[11px]">{error}</p>
            </div>
          ) : (
            <div className="text-center space-y-2 text-gray-400">
              <ImageIcon className="w-12 h-12 text-gray-200 mx-auto" />
              <p className="text-xs font-bold">Your Generated Art Canvas</p>
              <p className="text-[10px] text-gray-300 max-w-xs leading-relaxed">Describe your print graphic decals, tap Generate, and the rendered artwork will appear here.</p>
            </div>
          )}
        </div>

        {/* Quick action with result */}
        {generatedUrl && onAddProductWithImage && (
          <div className="w-full mt-4 pt-3 border-t border-gray-50 flex justify-end">
            <button
              onClick={() => onAddProductWithImage(generatedUrl)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all"
            >
              Use This Image as Product Thumbnail
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
