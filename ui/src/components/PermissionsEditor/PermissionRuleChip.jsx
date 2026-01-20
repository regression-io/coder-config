import React, { useState } from 'react';
import { X, MoreHorizontal } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipTrigger
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { parsePermissionRule, getPermissionTypeConfig, getFriendlyExplanation } from './utils';

export default function PermissionRuleChip({
  rule,
  category,
  onEdit,
  onDelete,
  readOnly
}) {
  const [hovered, setHovered] = useState(false);
  const parsed = parsePermissionRule(rule);
  const typeConfig = getPermissionTypeConfig(parsed.type);
  const explanation = getFriendlyExplanation(rule, category);

  // Truncate long rules for display
  const displayRule = rule.length > 25 ? rule.substring(0, 22) + '...' : rule;

  return (
    <div
      className="inline-flex items-center group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <Badge
              variant="secondary"
              className={cn(
                "cursor-default transition-all text-xs font-mono py-1 px-2 h-7",
                category === 'allow' && "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300",
                category === 'ask' && "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
                category === 'deny' && "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300",
                !readOnly && "rounded-r-none"
              )}
            >
              {displayRule}
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-md p-3">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">{explanation.summary}</p>
              <p className="text-xs text-muted-foreground mt-1">{explanation.detail}</p>
            </div>

            <div className={cn(
              "text-xs px-2 py-1 rounded",
              category === 'allow' && "bg-green-500/20 text-green-700 dark:text-green-300",
              category === 'ask' && "bg-amber-500/20 text-amber-700 dark:text-amber-300",
              category === 'deny' && "bg-red-500/20 text-red-700 dark:text-red-300"
            )}>
              {explanation.categoryMeaning}
            </div>

            {explanation.examples && explanation.examples.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Examples: </span>
                {explanation.examples.join(', ')}
              </div>
            )}

            <code className="text-[10px] text-muted-foreground/70 block break-all">
              Pattern: {rule}
            </code>
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Action button - appears on hover */}
      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "h-7 px-1 rounded-r transition-all border-l",
                "hover:bg-black/10 dark:hover:bg-white/10",
                category === 'allow' && "bg-green-200 dark:bg-green-900 border-green-300 dark:border-green-800",
                category === 'ask' && "bg-amber-200 dark:bg-amber-900 border-amber-300 dark:border-amber-800",
                category === 'deny' && "bg-red-200 dark:bg-red-900 border-red-300 dark:border-red-800",
                hovered ? "opacity-100" : "opacity-0"
              )}
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem onClick={onEdit}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
