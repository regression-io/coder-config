import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { GraduationCap, ChevronRight, ChevronLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Extracted data and utilities
import tutorialSections from './tutorial/data/tutorialSections';
import tutorialContent from './tutorial/data/tutorialContent';
import { formatMarkdown } from './docs/utils/markdown';

// Section color themes
const SECTION_COLORS = {
  'welcome': { bg: 'bg-violet-500', light: 'bg-violet-100 dark:bg-violet-950', text: 'text-violet-600 dark:text-violet-400' },
  'first-project': { bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400' },
  'rules-guide': { bg: 'bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' },
  'mcp-guide': { bg: 'bg-orange-500', light: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-600 dark:text-orange-400' },
  'permissions-guide': { bg: 'bg-green-500', light: 'bg-green-100 dark:bg-green-950', text: 'text-green-600 dark:text-green-400' },
  'memory-guide': { bg: 'bg-pink-500', light: 'bg-pink-100 dark:bg-pink-950', text: 'text-pink-600 dark:text-pink-400' },
  'plugins-guide': { bg: 'bg-purple-500', light: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' },
  'workstreams-guide': { bg: 'bg-cyan-500', light: 'bg-cyan-100 dark:bg-cyan-950', text: 'text-cyan-600 dark:text-cyan-400' },
  'loops-guide': { bg: 'bg-teal-500', light: 'bg-teal-100 dark:bg-teal-950', text: 'text-teal-600 dark:text-teal-400' },
  'multi-tool-guide': { bg: 'bg-amber-500', light: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-600 dark:text-amber-400' },
  'next-steps': { bg: 'bg-rose-500', light: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-600 dark:text-rose-400' },
};

const STORAGE_KEY = 'claude-config-tutorial-visited';

export default function TutorialView() {
  const [activeSection, setActiveSection] = useState('intro');
  const [expandedSections, setExpandedSections] = useState({ 'welcome': true });
  const [visitedSections, setVisitedSections] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const contentRef = useRef(null);

  // Scroll to top when section changes
  useEffect(() => {
    if (contentRef.current) {
      const scrollContainer = contentRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    }
  }, [activeSection]);

  // Mark section as visited when viewed
  useEffect(() => {
    if (activeSection && !visitedSections.includes(activeSection)) {
      const newVisited = [...visitedSections, activeSection];
      setVisitedSections(newVisited);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newVisited));
    }
  }, [activeSection, visitedSections]);

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const currentDoc = tutorialContent[activeSection];

  // Get flat list of all section IDs for navigation
  const allSectionIds = tutorialSections.flatMap(section =>
    section.subsections.length > 0
      ? section.subsections.map(s => s.id)
      : [section.id]
  );

  const currentIndex = allSectionIds.indexOf(activeSection);
  const prevSection = currentIndex > 0 ? allSectionIds[currentIndex - 1] : null;
  const nextSection = currentIndex < allSectionIds.length - 1 ? allSectionIds[currentIndex + 1] : null;

  // Calculate progress
  const progressPercent = Math.round((visitedSections.length / allSectionIds.length) * 100);

  // Find parent section for current subsection
  const getCurrentParentSection = () => {
    for (const section of tutorialSections) {
      if (section.id === activeSection) return section;
      if (section.subsections.some(s => s.id === activeSection)) return section;
    }
    return tutorialSections[0];
  };

  const parentSection = getCurrentParentSection();
  const sectionColor = SECTION_COLORS[parentSection.id] || SECTION_COLORS['welcome'];

  // Find section title by ID
  const getSectionTitle = (id) => {
    for (const section of tutorialSections) {
      if (section.id === id) return section.title;
      const sub = section.subsections.find(s => s.id === id);
      if (sub) return sub.title;
    }
    return '';
  };

  // Content is from our own static files, not user input - safe to render as HTML
  const renderContent = (content) => {
    return { __html: formatMarkdown(content) };
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r border-border bg-muted/30 flex flex-col">
        {/* Header with gradient */}
        <div className="p-4 border-b border-border bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Tutorial</h2>
              <p className="text-xs text-muted-foreground">Step-by-step guide</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{progressPercent}% complete</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {tutorialSections.map((section, sectionIndex) => {
              const Icon = section.icon;
              const color = SECTION_COLORS[section.id] || SECTION_COLORS['welcome'];
              const isActive = activeSection === section.id || section.subsections.some(s => s.id === activeSection);
              const allSubsVisited = section.subsections.length > 0
                ? section.subsections.every(s => visitedSections.includes(s.id))
                : visitedSections.includes(section.id);

              return (
                <div key={section.id} className="mb-1">
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-accent text-left transition-all",
                      isActive && "bg-accent"
                    )}
                    onClick={() => {
                      if (section.subsections.length > 0) {
                        toggleSection(section.id);
                        if (!expandedSections[section.id]) {
                          setActiveSection(section.subsections[0].id);
                        }
                      } else {
                        setActiveSection(section.id);
                      }
                    }}
                  >
                    <span className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                      isActive ? color.bg + " text-white" : color.light
                    )}>
                      {allSubsVisited ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className={cn("w-4 h-4", !isActive && color.text)} />
                      )}
                    </span>
                    <span className={cn("flex-1", isActive && "font-medium")}>{section.title}</span>
                    {section.subsections.length > 0 && (
                      <ChevronRight className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform",
                        expandedSections[section.id] && "rotate-90"
                      )} />
                    )}
                  </button>
                  {section.subsections.length > 0 && expandedSections[section.id] && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-border pl-3">
                      {section.subsections.map((sub) => {
                        const isSubActive = activeSection === sub.id;
                        const isVisited = visitedSections.includes(sub.id);
                        return (
                          <button
                            key={sub.id}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent text-foreground flex items-center gap-2",
                              isSubActive && "bg-accent font-medium",
                              isSubActive && color.text
                            )}
                            onClick={() => setActiveSection(sub.id)}
                          >
                            {isVisited && !isSubActive && (
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                            )}
                            <span className={cn(!isVisited && !isSubActive && "ml-5")}>
                              {sub.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Section header banner */}
        <div className={cn(
          "px-8 py-4 border-b border-border",
          sectionColor.light
        )}>
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              sectionColor.bg, "text-white"
            )}>
              <parentSection.icon className="w-5 h-5" />
            </div>
            <div>
              <p className={cn("text-sm font-medium", sectionColor.text)}>
                {parentSection.title}
              </p>
              <h1 className="text-lg font-semibold text-foreground">
                {currentDoc?.title || getSectionTitle(activeSection)}
              </h1>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1" ref={contentRef}>
          <div className="max-w-3xl mx-auto p-8">
            {currentDoc ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-border"
                dangerouslySetInnerHTML={renderContent(currentDoc.content)}
              />
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a topic from the sidebar</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Navigation Footer */}
        <div className="border-t border-border p-4 bg-muted/30">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            {prevSection ? (
              <Button
                variant="ghost"
                onClick={() => setActiveSection(prevSection)}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="max-w-[150px] truncate">{getSectionTitle(prevSection)}</span>
              </Button>
            ) : (
              <div />
            )}

            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} of {allSectionIds.length}
            </span>

            {nextSection ? (
              <Button
                onClick={() => setActiveSection(nextSection)}
                className={cn("flex items-center gap-2", sectionColor.bg, "hover:opacity-90")}
              >
                <span className="max-w-[150px] truncate">{getSectionTitle(nextSection)}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setActiveSection('intro')}
                className="flex items-center gap-2"
              >
                Start Over
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
