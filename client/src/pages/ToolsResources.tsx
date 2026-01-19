import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  FolderOpen,
  Presentation,
  FileImage,
  FileSpreadsheet,
  File,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Star,
  Share2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import heroImage from "@assets/40340_1765410597164.jpg";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Resource {
  id: string;
  title: string;
  description: string;
  type: "pdf" | "docx" | "pptx" | "xlsx" | "image" | "link";
  usedCount?: number;
  isNew?: boolean;
  isFavorite?: boolean;
}

interface ResourceCategory {
  title: string;
  color: string;
  bgClass: string;
  borderClass: string;
  resources: Resource[];
}

const categoryMeta: Record<string, { color: string; bgClass: string; borderClass: string }> = {
  "Marketing Slick Sheets": { 
    color: "bg-[#51142a]", 
    bgClass: "bg-[#51142a]/10",
    borderClass: "border-[#51142a]/30"
  },
  "Document Templates": { 
    color: "bg-[#153D63]", 
    bgClass: "bg-[#153D63]/10",
    borderClass: "border-[#153D63]/30"
  },
  "Presentations": { 
    color: "bg-[#894501]", 
    bgClass: "bg-[#894501]/10",
    borderClass: "border-[#894501]/30"
  },
  "Brand Assets": { 
    color: "bg-[#3A7C22]", 
    bgClass: "bg-[#3A7C22]/10",
    borderClass: "border-[#3A7C22]/30"
  },
  "Company Documents": { 
    color: "bg-[#0E2841]", 
    bgClass: "bg-[#0E2841]/10",
    borderClass: "border-[#0E2841]/30"
  }
};

const resourceCategories: ResourceCategory[] = [
  {
    title: "Marketing Slick Sheets",
    ...categoryMeta["Marketing Slick Sheets"],
    resources: [
      {
        id: "1",
        title: "Albers Aerospace Corporate Overview",
        description: "Company overview slick sheet for client presentations and proposals",
        type: "pdf",
        usedCount: 24,
        isNew: true
      },
      {
        id: "2",
        title: "Albers Defense Capabilities Brief",
        description: "Defense division capabilities and past performance summary",
        type: "pdf",
        usedCount: 18
      },
      {
        id: "3",
        title: "Albers Industrials Services Overview",
        description: "Industrial division services and solutions summary",
        type: "pdf",
        usedCount: 12
      }
    ]
  },
  {
    title: "Document Templates",
    ...categoryMeta["Document Templates"],
    resources: [
      {
        id: "4",
        title: "Proposal Template - Technical Volume",
        description: "Standard template for technical proposal volumes",
        type: "docx",
        usedCount: 32
      },
      {
        id: "5",
        title: "Proposal Template - Management Volume",
        description: "Standard template for management proposal volumes",
        type: "docx",
        usedCount: 28
      },
      {
        id: "6",
        title: "Past Performance Template",
        description: "Template for documenting past performance references",
        type: "docx",
        usedCount: 22
      },
      {
        id: "7",
        title: "Cost Volume Template",
        description: "Standard cost volume spreadsheet with formulas",
        type: "xlsx",
        usedCount: 19
      }
    ]
  },
  {
    title: "Presentations",
    ...categoryMeta["Presentations"],
    resources: [
      {
        id: "8",
        title: "Company Presentation Deck",
        description: "Corporate PowerPoint template with Albers branding",
        type: "pptx",
        usedCount: 15
      },
      {
        id: "9",
        title: "Capabilities Briefing Template",
        description: "Template for customer capabilities briefings",
        type: "pptx",
        usedCount: 11
      }
    ]
  },
  {
    title: "Brand Assets",
    ...categoryMeta["Brand Assets"],
    resources: [
      {
        id: "10",
        title: "Albers Logo Package",
        description: "Official logos in various formats (PNG, SVG, EPS)",
        type: "image",
        usedCount: 45
      },
      {
        id: "11",
        title: "Brand Guidelines",
        description: "Official Albers Aerospace brand style guide",
        type: "pdf",
        usedCount: 20
      },
      {
        id: "12",
        title: "Email Signature Template",
        description: "Standard email signature format with instructions",
        type: "docx",
        usedCount: 38
      }
    ]
  },
  {
    title: "Company Documents",
    ...categoryMeta["Company Documents"],
    resources: [
      {
        id: "13",
        title: "Organizational Chart",
        description: "Current company organizational structure",
        type: "pdf",
        usedCount: 16,
        isNew: true
      },
      {
        id: "14",
        title: "Employee Handbook",
        description: "Company policies and procedures guide",
        type: "pdf",
        usedCount: 25
      }
    ]
  }
];

const getFileIcon = (type: Resource["type"], colorClass: string) => {
  const iconClass = `w-6 h-6 text-white`;
  switch (type) {
    case "pdf":
      return <FileText className={iconClass} />;
    case "docx":
      return <File className={iconClass} />;
    case "pptx":
      return <Presentation className={iconClass} />;
    case "xlsx":
      return <FileSpreadsheet className={iconClass} />;
    case "image":
      return <FileImage className={iconClass} />;
    case "link":
      return <FolderOpen className={iconClass} />;
    default:
      return <File className={iconClass} />;
  }
};

const getFileTypeBadge = (type: Resource["type"]) => {
  const labels: Record<Resource["type"], string> = {
    pdf: "PDF",
    docx: "Word",
    pptx: "PowerPoint",
    xlsx: "Excel",
    image: "Image",
    link: "Link"
  };
  return labels[type];
};

export default function ToolsResources() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"mostUsed" | "alphabetical" | "category">("mostUsed");
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(resourceCategories.map(c => c.title))
  );
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(
    new Set(resourceCategories.map(c => c.title))
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setVisibleCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleAccordion = (category: string) => {
    setOpenAccordions(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleFavorite = (resourceId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  };

  const handleShare = (resource: Resource) => {
    navigator.clipboard.writeText(window.location.href + `#resource-${resource.id}`);
    toast({
      title: "Link copied",
      description: `Link to "${resource.title}" copied to clipboard`,
    });
  };

  // Table of Contents Component with Filters
  const TableOfContents = () => (
    <Card className="p-4 sm:p-6 sticky top-4" data-testid="card-table-of-contents">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-base sm:text-lg font-bold text-foreground">Table of Contents</h2>
      </div>
      
      <nav className="space-y-3">
        {resourceCategories.map((category) => (
          <div key={category.title} className="border-b border-border pb-3 last:border-0">
            <div className="flex items-start gap-2 mb-2">
              <Checkbox
                id={`category-${category.title}`}
                checked={visibleCategories.has(category.title)}
                onCheckedChange={() => toggleCategory(category.title)}
                className="mt-0.5"
                data-testid={`checkbox-category-${category.title.toLowerCase().replace(/\s+/g, '-')}`}
              />
              <label
                htmlFor={`category-${category.title}`}
                className="font-semibold text-sm cursor-pointer select-none flex-1 text-foreground"
              >
                {category.title}
                <span className="text-muted-foreground ml-2 text-xs">
                  ({category.resources.length})
                </span>
              </label>
            </div>
          </div>
        ))}
      </nav>
    </Card>
  );

  // Resource Card Component
  const ResourceCard = ({ resource, category }: { resource: Resource; category: ResourceCategory }) => (
    <Card 
      className={`overflow-hidden border ${category.borderClass}`}
      data-testid={`card-resource-${resource.id}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2 rounded-lg ${category.color} shrink-0`}>
            {getFileIcon(resource.type, category.color)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground">{resource.title}</h3>
              {resource.isNew && (
                <Badge className="bg-amber-500 text-white text-xs flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  New
                </Badge>
              )}
            </div>
            <Badge variant="outline" className={`mt-1 text-xs ${category.bgClass}`}>
              {category.title}
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {getFileTypeBadge(resource.type)}
          </Badge>
        </div>
        
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {resource.description}
        </p>
        
        <div className="text-xs text-muted-foreground mb-3">
          Used {resource.usedCount || 0} times
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className={`flex-1 ${category.color} text-white hover:opacity-90`}
            data-testid={`button-download-${resource.id}`}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="toggle-elevate"
            onClick={() => toggleFavorite(resource.id)}
            data-testid={`button-favorite-${resource.id}`}
          >
            <Star className={`w-4 h-4 ${favorites.has(resource.id) ? "fill-amber-500 text-amber-500" : ""}`} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleShare(resource)}
            data-testid={`button-share-${resource.id}`}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-32">
      {/* Hero Header */}
      <div className="relative h-40 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#51142a]/90 via-[#51142a]/80 to-[#0E2841]/70" />
        <div className="relative z-10 h-full flex items-center px-6 md:px-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
              <FolderOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Tools and Resources</h1>
              <p className="text-white/80">
                Access marketing materials, document templates, brand assets, and other company resources
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm"
              data-testid="input-search-resources"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-sort-by">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mostUsed">Most Used</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Two Column Layout: Table of Contents + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Left Column: Table of Contents */}
        <div className="lg:col-span-1">
          <TableOfContents />
        </div>
        
        {/* Right Column: Resource Categories */}
        <div className="lg:col-span-3 space-y-6">
          {resourceCategories.map((category) => {
            // Skip if category is filtered out
            if (!visibleCategories.has(category.title)) return null;

            // Filter resources based on search query
            const filteredResources = category.resources.filter(resource => 
              searchQuery === "" || 
              resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              resource.description.toLowerCase().includes(searchQuery.toLowerCase())
            );

            // Only show category if it has matching resources
            if (filteredResources.length === 0) return null;

            // Sort resources based on selected sort option
            const sortedResources = [...filteredResources].sort((a, b) => {
              if (sortBy === "mostUsed") {
                return (b.usedCount || 0) - (a.usedCount || 0);
              } else if (sortBy === "alphabetical") {
                return a.title.localeCompare(b.title);
              }
              return 0;
            });

            const isOpen = openAccordions.has(category.title);

            return (
              <Collapsible 
                key={category.title}
                open={isOpen}
                onOpenChange={() => toggleAccordion(category.title)}
              >
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between p-4 hover-elevate"
                      data-testid={`button-toggle-${category.title.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground">{category.title}</h2>
                        <Badge variant="secondary" className="ml-2 bg-slate-700 text-white border-slate-600">
                          {sortedResources.length}
                        </Badge>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedResources.map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} category={category} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
}
