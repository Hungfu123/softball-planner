export function LoadingSkeleton() {
  return (
    <div className="py-12 flex flex-col items-center gap-4">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-navy-600 animate-[bounce_0.6s_ease-in-out_infinite]" />
        <div className="w-2.5 h-2.5 rounded-full bg-navy-600 animate-[bounce_0.6s_ease-in-out_0.15s_infinite]" />
        <div className="w-2.5 h-2.5 rounded-full bg-navy-600 animate-[bounce_0.6s_ease-in-out_0.3s_infinite]" />
      </div>
      <span className="text-sm text-gray-400">Laden...</span>
    </div>
  )
}
