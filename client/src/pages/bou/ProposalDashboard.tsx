import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import RichTextEditor from "@/components/RichTextEditor";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  CartesianGrid,
  Area,
  AreaChart
} from "recharts";
import { 
  Trophy, 
  TrendingDown, 
  FileEdit, 
  Clock, 
  CheckCircle2, 
  RefreshCw,
  ExternalLink,
  LayoutDashboard,
  Edit2,
  Save,
  X,
  Target,
  TrendingUp,
  Users,
  BarChart3,
  PieChartIcon,
  Activity,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@assets/29670_1765410593099.jpg";
import { format } from "date-fns";

interface DashboardData {
  winsYTD: number;
  lossesYTD: number;
  currentlyWriting: number;
  sourceSelectionYTD: number;
  totalSubmittals: number;
  winRate: string;
  businessUnitSubmissions: {
    Defense: number;
    Innovation: number;
    Industrials: number;
  };
  workloadByAssignee: Array<{ name: string; count: number }>;
  winsLossesBreakdown: {
    awarded: number;
    selectedNotFunded: number;
    notAwarded: number;
    sourceSelection: number;
  };
  lastUpdated: string;
}

interface SiteContent {
  id: string;
  title: string;
  content: string;
  lastUpdatedBy?: string;
  updatedAt?: string;
}

interface DashboardViewEntry {
  id: string;
  user_id: string;
  viewed_at: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface DashboardViewsData {
  views: DashboardViewEntry[];
  stats: {
    unique_viewers: string;
    total_views: string;
  };
}

interface UserInfo {
  id: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function ProposalDashboard() {
  const { toast } = useToast();
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showViewAnalytics, setShowViewAnalytics] = useState(false);
  const viewRecorded = useRef(false);

  // Fetch user info to check if system admin
  const { data: userInfo } = useQuery<UserInfo>({
    queryKey: ['/api/auth/me'],
  });

  const isSystemAdmin = userInfo?.role === 'admin';

  // Record page view on mount
  useEffect(() => {
    if (!viewRecorded.current) {
      viewRecorded.current = true;
      apiRequest("POST", "/api/bou/dashboard/view", {}).catch(() => {
        // Silently ignore errors
      });
    }
  }, []);

  // Fetch view analytics (only for system admins)
  const { data: viewsData, isLoading: viewsLoading } = useQuery<DashboardViewsData>({
    queryKey: ['/api/bou/dashboard/views'],
    enabled: isSystemAdmin,
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ['/api/clickup/dashboard'],
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const { data: reportContent, isLoading: reportLoading } = useQuery<SiteContent>({
    queryKey: ['/api/site-content', 'bou-monthly-activity-report'],
  });

  const updateReportMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      return apiRequest("PUT", "/api/site-content/bou-monthly-activity-report", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/site-content', 'bou-monthly-activity-report'] });
      setIsEditingReport(false);
      toast({
        title: "Report Updated",
        description: "Monthly activity report has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEditReport = () => {
    setEditTitle(reportContent?.title || "BOU Monthly Activity Report");
    setEditContent(reportContent?.content || "");
    setIsEditingReport(true);
  };

  const handleSaveReport = () => {
    updateReportMutation.mutate({ title: editTitle, content: editContent });
  };

  const winsLossesData = data ? [
    { name: 'Awarded', value: data.winsLossesBreakdown.awarded, color: '#22c55e' },
    { name: 'Selected/Not Funded', value: data.winsLossesBreakdown.selectedNotFunded, color: '#f97316' },
    { name: 'Not Awarded', value: data.winsLossesBreakdown.notAwarded, color: '#ef4444' },
    { name: 'Source Selection', value: data.winsLossesBreakdown.sourceSelection, color: '#eab308' },
  ] : [];

  const businessUnitData = data ? [
    { name: 'Defense', submissions: data.businessUnitSubmissions.Defense, fill: '#51142a' },
    { name: 'Innovation', submissions: data.businessUnitSubmissions.Innovation, fill: '#0E2841' },
    { name: 'Industrials', submissions: data.businessUnitSubmissions.Industrials, fill: '#153D63' },
  ] : [];

  const workloadData = data?.workloadByAssignee.map((item, index) => ({
    ...item,
    fill: ['#51142a', '#0E2841', '#153D63', '#3b82f6', '#8b5cf6'][index % 5]
  })) || [];

  if (error) {
    return (
      <div className="space-y-6">
        <div className="relative h-48 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#51142a]/90 via-[#51142a]/80 to-[#0E2841]/70" />
          <div className="relative z-10 h-full flex items-center px-6 md:px-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <LayoutDashboard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Proposal Dashboard</h1>
                <p className="text-white/80">Business Operations Unit - Live ClickUp Data</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 max-w-7xl mx-auto">
          <Card className="border-destructive/50">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
                <p className="text-muted-foreground mb-6">Failed to load ClickUp data. Please check your API key configuration.</p>
                <Button onClick={() => refetch()} data-testid="button-retry">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Header */}
      <div className="relative h-48 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#51142a]/90 via-[#51142a]/80 to-[#0E2841]/70" />
        <div className="relative z-10 h-full flex items-center justify-between px-6 md:px-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Proposal Dashboard</h1>
              <p className="text-white/80">Business Operations Unit - Live ClickUp Data</p>
              {data?.lastUpdated && (
                <p className="text-white/60 text-sm mt-1">
                  Last synced: {new Date(data.lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button 
              variant="secondary"
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              data-testid="button-refresh-dashboard"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <a 
              href="https://app.clickup.com/9014395930/v/db/8cmth0u-434" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                data-testid="button-open-clickup"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                ClickUp
              </Button>
            </a>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto space-y-6">
        {/* Mobile Action Buttons */}
        <div className="flex sm:hidden items-center gap-2">
          <Button 
            variant="outline"
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex-1"
            data-testid="button-refresh-dashboard-mobile"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <a 
            href="https://app.clickup.com/9014395930/v/db/8cmth0u-434" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" size="sm" className="w-full" data-testid="button-open-clickup-mobile">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open ClickUp
            </Button>
          </a>
        </div>

        {/* Page View Analytics - System Admin Only */}
        {isSystemAdmin && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <CardTitle className="text-base">Page View Analytics</CardTitle>
                  <Badge variant="outline" className="text-xs">Admin Only</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowViewAnalytics(!showViewAnalytics)}
                  data-testid="button-toggle-view-analytics"
                >
                  {showViewAnalytics ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {!showViewAnalytics && viewsData && (
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span><strong>{viewsData.stats.total_views}</strong> total views</span>
                  <span><strong>{viewsData.stats.unique_viewers}</strong> unique viewers</span>
                </div>
              )}
            </CardHeader>
            {showViewAnalytics && (
              <CardContent className="pt-2">
                {viewsLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : viewsData ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{viewsData.stats.total_views}</div>
                        <div className="text-xs text-muted-foreground">Total Views</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{viewsData.stats.unique_viewers}</div>
                        <div className="text-xs text-muted-foreground">Unique Viewers</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recent Views</h4>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {viewsData.views.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No views recorded yet</p>
                          ) : (
                            viewsData.views.map((view) => (
                              <div
                                key={view.id}
                                className="flex items-center justify-between p-2 bg-background rounded border text-sm"
                                data-testid={`view-entry-${view.id}`}
                              >
                                <div>
                                  <span className="font-medium">
                                    {view.first_name} {view.last_name}
                                  </span>
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    ({view.email})
                                  </span>
                                </div>
                                <span className="text-muted-foreground text-xs">
                                  {format(new Date(view.viewed_at), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Unable to load view analytics</p>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Key Metrics - Redesigned */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Wins YTD" 
            value={data?.winsYTD} 
            isLoading={isLoading}
            icon={<Trophy className="w-5 h-5" />}
            gradient="from-emerald-500 to-emerald-600"
            iconBg="bg-emerald-500/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <MetricCard 
            title="Losses YTD" 
            value={data?.lossesYTD} 
            isLoading={isLoading}
            icon={<TrendingDown className="w-5 h-5" />}
            gradient="from-amber-500 to-orange-500"
            iconBg="bg-amber-500/20"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <MetricCard 
            title="Currently Writing" 
            value={data?.currentlyWriting} 
            isLoading={isLoading}
            icon={<FileEdit className="w-5 h-5" />}
            gradient="from-blue-500 to-blue-600"
            iconBg="bg-blue-500/20"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <MetricCard 
            title="Source Selection" 
            value={data?.sourceSelectionYTD} 
            isLoading={isLoading}
            icon={<Clock className="w-5 h-5" />}
            gradient="from-purple-500 to-violet-600"
            iconBg="bg-purple-500/20"
            iconColor="text-purple-600 dark:text-purple-400"
          />
        </div>

        {/* Performance Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Win/Loss Breakdown Chart */}
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Win/Loss Breakdown YTD</CardTitle>
                  <p className="text-sm text-muted-foreground">Proposal outcomes by category</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={winsLossesData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={130} 
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 13 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {winsLossesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">YTD Performance</CardTitle>
                  <p className="text-sm text-muted-foreground">Key metrics summary</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 p-5">
                    <div className="relative z-10">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Total Submittals</p>
                      <p className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{data?.totalSubmittals || 0}</p>
                    </div>
                    <Activity className="absolute right-3 bottom-3 w-12 h-12 text-slate-300 dark:text-slate-600" />
                  </div>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5">
                    <div className="relative z-10">
                      <p className="text-sm font-medium text-emerald-100 mb-1">Win Rate</p>
                      <p className="text-4xl font-bold tracking-tight text-white">{data?.winRate || 0}%</p>
                    </div>
                    <TrendingUp className="absolute right-3 bottom-3 w-12 h-12 text-emerald-400/30" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Unit Submissions */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Submissions by Division</CardTitle>
                  <p className="text-sm text-muted-foreground">Business unit breakdown YTD</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={businessUnitData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="submissions" radius={[6, 6, 0, 0]}>
                        {businessUnitData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#51142a]" />
                      <span className="text-sm text-muted-foreground">Defense</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#0E2841]" />
                      <span className="text-sm text-muted-foreground">Innovation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#153D63]" />
                      <span className="text-sm text-muted-foreground">Industrials</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Workload Distribution */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Team Workload</CardTitle>
                  <p className="text-sm text-muted-foreground">Current proposal assignments</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : workloadData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={workloadData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="name"
                    >
                      {workloadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="hsl(var(--card))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [`${value} proposals`, name]}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">No workload data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Activity Report */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileEdit className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {reportContent?.title || "Monthly Activity Report"}
                  </CardTitle>
                  {reportContent?.updatedAt && (
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(reportContent.updatedAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEditReport}
                data-testid="button-edit-report"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Report
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {reportLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : reportContent?.content ? (
              <div 
                className="bg-muted/30 rounded-xl p-6 report-content"
                data-testid="text-monthly-report-content"
                dangerouslySetInnerHTML={{ __html: reportContent.content }}
              />
            ) : (
              <div className="w-full rounded-xl border-2 border-dashed border-border bg-muted/20 min-h-[200px] flex items-center justify-center">
                <div className="text-center p-8">
                  <FileEdit className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">
                    No monthly activity report yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click "Edit Report" to add content
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Report Dialog */}
      <Dialog open={isEditingReport} onOpenChange={setIsEditingReport}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Monthly Activity Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="BOU Monthly Activity Report"
                data-testid="input-report-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Content</label>
              <div data-testid="editor-report-content">
                <RichTextEditor
                  content={editContent}
                  onChange={setEditContent}
                  placeholder="Paste or type your monthly activity report here..."
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsEditingReport(false)}
              data-testid="button-cancel-edit"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSaveReport}
              disabled={updateReportMutation.isPending}
              data-testid="button-save-report"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateReportMutation.isPending ? "Saving..." : "Save Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  isLoading, 
  icon,
  gradient,
  iconBg,
  iconColor
}: { 
  title: string; 
  value?: number; 
  isLoading: boolean;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="overflow-hidden hover-elevate transition-all duration-200">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className={`w-1.5 bg-gradient-to-b ${gradient}`} />
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground truncate">{title}</p>
                {isLoading ? (
                  <Skeleton className="h-9 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold tracking-tight mt-1">{value ?? 0}</p>
                )}
              </div>
              <div className={`p-2.5 rounded-lg ${iconBg} flex-shrink-0`}>
                <div className={iconColor}>{icon}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
