import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Pin } from "lucide-react";

interface Bulletin {
  id: string;
  division: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_published: boolean;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
}

interface DivisionBulletinsProps {
  division: string;
  limit?: number;
  title?: string;
}

export default function DivisionBulletins({ division, limit = 5, title = "Bulletins" }: DivisionBulletinsProps) {
  const { data: bulletins, isLoading, error } = useQuery<Bulletin[]>({
    queryKey: [`/api/divisions/${division}/bulletins`],
    queryFn: async () => {
      const response = await fetch(`/api/divisions/${division}/bulletins`);
      if (!response.ok) throw new Error("Failed to fetch bulletins");
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Unable to load bulletins at this time.</p>
        </CardContent>
      </Card>
    );
  }

  const displayBulletins = bulletins?.slice(0, limit) || [];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {displayBulletins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No bulletins yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayBulletins.map((bulletin) => (
              <article 
                key={bulletin.id} 
                className="p-4 border rounded-lg hover-elevate"
                data-testid={`bulletin-item-${bulletin.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    {bulletin.is_pinned && (
                      <Pin className="w-4 h-4 text-primary" />
                    )}
                    {bulletin.title}
                  </h3>
                  {bulletin.is_pinned && (
                    <Badge variant="secondary" className="text-xs shrink-0">Pinned</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mb-2">{bulletin.content}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {bulletin.first_name && bulletin.last_name && (
                    <span>By {bulletin.first_name} {bulletin.last_name}</span>
                  )}
                  <span>•</span>
                  <span>{new Date(bulletin.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
