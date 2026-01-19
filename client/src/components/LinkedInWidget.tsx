import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock } from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import { safeFormatDate } from "@/lib/utils";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { canEditLinkedIn } from "@/lib/permissions";

interface LinkedinPost {
  id: string;
  content: string;
  postUrl: string | null;
  imageUrl: string | null;
  postedAt: string | null;
  syncedBy: string | null;
  syncedByName: string | null;
  syncedAt: string;
  isActive: boolean;
}

export default function LinkedInWidget() {
  const { user } = useAuth();
  const isAdmin = canEditLinkedIn(user?.role);

  const { data: post, isLoading } = useQuery<LinkedinPost | null>({
    queryKey: ["/api/linkedin/latest"],
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <SiLinkedin className="w-5 h-5 text-[#0A66C2]" />
            Latest from LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-3 w-full">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!post) {
    return (
      <Card className="w-full h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <SiLinkedin className="w-5 h-5 text-[#0A66C2]" />
            Latest from LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 flex-1 flex flex-col justify-center">
          <SiLinkedin className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            No LinkedIn post synced yet
          </p>
          <div className="flex flex-col gap-2">
            <a 
              href="https://www.linkedin.com/company/albers-aerospace/posts/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="w-full gap-2">
                <SiLinkedin className="w-4 h-4" />
                Follow us on LinkedIn
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
            {isAdmin && (
              <Link href="/admin/linkedin">
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                  Sync a LinkedIn post
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col" data-testid="linkedin-widget">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <SiLinkedin className="w-5 h-5 text-[#0A66C2]" />
            Latest from LinkedIn
          </CardTitle>
          {post.postUrl && (
            <a 
              href={post.postUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 flex flex-col">
        <p className="text-sm whitespace-pre-wrap line-clamp-6" data-testid="linkedin-post-content">
          {post.content}
        </p>
        
        {post.imageUrl && (
          <img 
            src={post.imageUrl} 
            alt="LinkedIn post" 
            className="w-full h-auto rounded-lg flex-1 object-cover"
            data-testid="linkedin-post-image"
          />
        )}
        
        <div className="flex items-center justify-between pt-2 border-t mt-auto">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {post.postedAt ? safeFormatDate(post.postedAt) : `Synced ${safeFormatDate(post.syncedAt)}`}
          </span>
          
          {post.postUrl ? (
            <a 
              href={post.postUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#0A66C2]" data-testid="button-view-linkedin-post">
                View Post
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          ) : (
            <a 
              href="https://www.linkedin.com/company/albers-aerospace/posts/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" data-testid="button-view-linkedin-page">
                View Page
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
