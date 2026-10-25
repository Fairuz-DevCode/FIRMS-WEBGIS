import React, { useState } from 'react';
import { Upload, FileCode, CheckCircle2, AlertCircle, X, Layers } from 'lucide-react';
import parseGeoRaster, { GeoRaster } from 'georaster';

interface GeoTIFFUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGeoRasterLoaded: (georaster: GeoRaster, fileName: string) => void;
}

export const GeoTIFFUploaderModal: React.FC<GeoTIFFUploaderModalProps> = ({
  isOpen,
  onClose,
  onGeoRasterLoaded,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    name: string;
    width: number;
    height: number;
    bounds: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file.name.match(/\.(tif|tiff)$/i)) {
      setError('Format file harus berupa GeoTIFF (.tif atau .tiff)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const georaster = await parseGeoRaster(arrayBuffer);

      const bounds = `[${georaster.ymin.toFixed(4)}, ${georaster.xmin.toFixed(4)}] ke [${georaster.ymax.toFixed(4)}, ${georaster.xmax.toFixed(4)}]`;

      setSuccessInfo({
        name: file.name,
        width: georaster.width,
        height: georaster.height,
        bounds,
      });

      onGeoRasterLoaded(georaster, file.name);
      setLoading(false);
    } catch (err: any) {
      console.error('[GeoTIFF Parser] Failed to process raster:', err);
      setError(`Gagal membaca GeoTIFF: ${err.message || 'Format GeoTIFF tidak valid'}`);
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 text-emerald-400 font-bold text-lg">
          <Layers className="w-6 h-6" />
          <h3>Olah File GeoTIFF (.tif) Frontend</h3>
        </div>

        <p className="text-slate-300 text-xs mb-4 leading-relaxed">
          Unggah file raster GeoTIFF tutupan lahan Anda. Berkas akan langsung di-parse oleh browser (WebAssembly / Canvas JS) tanpa perlu disimpan ke database GIS PostGIS.
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-800/50 hover:bg-slate-800 transition-all rounded-xl p-6 text-center flex flex-col items-center justify-center cursor-pointer group"
        >
          <input
            type="file"
            accept=".tif,.tiff"
            className="hidden"
            id="geotiff-file-input"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <label htmlFor="geotiff-file-input" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-10 h-10 text-emerald-400 group-hover:scale-110 transition-transform mb-2" />
            <span className="text-sm font-semibold text-emerald-300">Pilih atau Drag & Drop Berkas .tif</span>
            <span className="text-[11px] text-slate-400 mt-1">Format didukung: GeoTIFF (.tif, .tiff)</span>
          </label>
        </div>

        {loading && (
          <div className="mt-4 p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-400 border-t-transparent" />
            <span className="text-xs text-emerald-300">Menganalisis matriks piksel GeoTIFF di frontend...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successInfo && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-lg space-y-1.5 text-xs text-slate-200">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>GeoTIFF Berhasil Diproses Client-Side!</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-slate-700/60">
              <div><span className="text-slate-400">File:</span> {successInfo.name}</div>
              <div><span className="text-slate-400">Dimensi:</span> {successInfo.width} x {successInfo.height} px</div>
              <div className="col-span-2 truncate"><span className="text-slate-400">Cakupan:</span> {successInfo.bounds}</div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
