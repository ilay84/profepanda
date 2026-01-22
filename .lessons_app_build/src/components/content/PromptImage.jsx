export default function PromptImage({ src, alt = "Prompt image" }) {
  if (!src) return null;

  return (
    <div className="mt-4 w-full">
      <div className="w-full rounded-2xl border border-slate-200 bg-white/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-center h-48 sm:h-56 px-4 py-3">
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full object-contain"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
