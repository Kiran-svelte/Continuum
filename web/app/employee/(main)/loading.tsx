export default function EmployeeLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-white/5 rounded" />
          <div className="h-4 w-64 bg-white/5 rounded mt-2" />
        </div>
        <div className="h-9 w-28 bg-white/5 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-white/5 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-white/5 rounded-xl" />
    </div>
  );
}
