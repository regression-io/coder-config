import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MoreVertical, Edit3, Trash2, ArrowRight, Copy, Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipTrigger
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { parsePermissionRule, getPermissionTypeConfig } from './utils';

export default function PermissionRuleItem({
  rule,
  category,
  onEdit,
  onDelete,
  onMove,
  readOnly
}) {
  const [copied, setCopied] = useState(false);
  const parsed = parsePermissionRule(rule);
  const typeConfig = getPermissionTypeConfig(parsed.type);
  const TypeIcon = typeConfig.icon;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rule);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200",
        "hover:border-gray-300 hover:shadow-sm transition-all"
      )}
    >
      {/* Permission Type Icon */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        typeConfig.bgColor
      )}>
        <TypeIcon className={cn("w-4 h-4", typeConfig.color)} />
      </div>

      {/* Rule Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", typeConfig.badgeClass)}>
            {parsed.type}
          </Badge>
          {parsed.hasWildcard && (
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="text-xs">
                  Wildcard
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Pattern uses wildcard (*) matching
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <code className="block text-sm font-mono text-gray-700 truncate mt-1 cursor-default">
              {rule}
            </code>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-md">
            <div className="space-y-2">
              <code className="text-xs break-all">{rule}</code>
              <p className="text-xs text-gray-300">{parsed.description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Actions */}
      <div className={cn(
        "flex items-center gap-1 transition-opacity",
        readOnly ? "opacity-50 pointer-events-none" : "opacity-0 group-hover:opacity-100"
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy rule</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Rule
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRight className="w-4 h-4 mr-2" />
                Move to...
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {['allow', 'ask', 'deny'].filter(c => c !== category).map(c => (
                  <DropdownMenuItem key={c} onClick={() => onMove(c)}>
                    Move to {c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Rule
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
