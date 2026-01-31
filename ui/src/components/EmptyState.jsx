import { cn } from "@/lib/utils";

/**
 * Consistent empty state with icon, title, description, and optional action.
 *
 * @example
 * <EmptyState
 *   icon={<Folder className="w-12 h-12" />}
 *   title="No Projects Yet"
 *   description="Add your first project to get started."
 *   action={<Button onClick={add}>Add Project</Button>}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div className={cn("p-12 text-center", className)}>
      {icon && (
        <div className="mx-auto mb-4 text-gray-300 dark:text-slate-600">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export default EmptyState;
