import React from 'react';
import { ChevronDown, Folder, FolderOpen, Plus, Check, AlertTriangle, Settings2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function ProjectSwitcher({
  projects = [],
  activeProject = null,
  onSwitch,
  onAddClick,
  onManageClick,
  disabled = false
}) {
  // Get display name with fallback
  const displayName = activeProject?.name || 'No project selected';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 max-w-[220px] h-9"
          disabled={disabled}
        >
          <FolderOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="truncate font-medium">{displayName}</span>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
          Projects
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {projects.length === 0 ? (
          <div className="px-3 py-6 text-sm text-gray-500 text-center">
            <Folder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No projects registered</p>
            <p className="text-xs mt-1">Add a project to get started</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {projects.map(project => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => !project.isActive && onSwitch(project.id)}
                className={`flex items-start gap-2 py-2 cursor-pointer ${
                  project.isActive ? 'bg-indigo-50' : ''
                }`}
                disabled={project.isActive}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {project.isActive ? (
                    <Check className="w-4 h-4 text-indigo-600" />
                  ) : project.exists ? (
                    <Folder className="w-4 h-4 text-gray-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`truncate font-medium ${
                    project.isActive ? 'text-indigo-700' : ''
                  }`}>
                    {project.name}
                  </div>
                  <div className="truncate text-xs text-gray-400 font-mono">
                    {project.path.replace(/^\/Users\/[^/]+/, '~')}
                  </div>
                  {!project.exists && (
                    <div className="text-xs text-amber-600 mt-0.5">
                      Path not found
                    </div>
                  )}
                </div>
                {project.hasClaudeConfig && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-green-400" title="Has .claude config" />
                  </div>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddClick} className="gap-2 cursor-pointer">
          <Plus className="w-4 h-4" />
          Add Project
        </DropdownMenuItem>
        {projects.length > 0 && (
          <DropdownMenuItem onClick={onManageClick} className="gap-2 cursor-pointer">
            <Settings2 className="w-4 h-4" />
            Manage Projects
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
