import { cn } from "@/lib/utils";

/**
 * Consistent page header with icon, title, subtitle, and action buttons.
 *
 * @example
 * <PageHeader
 *   icon={<FolderOpen className="w-5 h-5" />}
 *   iconColor="indigo"
 *   title="Projects"
 *   subtitle="Registered projects for quick switching"
 *   actions={
 *     <>
 *       <Button variant="outline" onClick={refresh}>Refresh</Button>
 *       <Button onClick={add}>Add Project</Button>
 *     </>
 *   }
 * />
 */
export function PageHeader({
  icon,
  iconColor = "indigo",
  title,
  subtitle,
  actions,
  className,
}) {
  const colorClasses = {
    indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    gray: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  };

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[iconColor])}>
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
