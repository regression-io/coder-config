import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export function Spinner({ className, size = "default" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  );
}

export function SpinnerOverlay({ children, loading, className }) {
  if (!loading) return children;

  return (
    <div className={cn("flex items-center justify-center h-64", className)}>
      <Spinner size="lg" className="text-indigo-600" />
    </div>
  );
}
