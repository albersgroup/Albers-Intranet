import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Search, Edit2, Loader2, ShieldCheck, ShieldX, BarChart3, UserCheck, UserX, Newspaper, Building2, Pin, Paperclip, Settings, TrendingUp, Trophy, Brain } from "lucide-react";
import KnowledgeBaseAdmin from "@/components/admin/KnowledgeBaseAdmin";
import { getRoleDisplayName } from "@/lib/permissions";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid } from "recharts";
import heroImage from "@assets/725708_1765410627983.jpg";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  managedDivisions?: string[];
  isVerified: boolean;
  lastLogin?: string;
  createdAt?: string;
  businessVertical?: string;
}

interface TopUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  loginCount: number;
  businessVertical?: string;
}

interface NewsStatsByVertical {
  division: string;
  totalArticles: number;
  pinnedArticles: number;
  articlesWithAttachments: number;
}

interface Analytics {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  roleDistribution: { role: string; count: number }[];
  verticalDistribution: { vertical: string; count: number }[];
  newsStats: {
    totalArticles: number;
    pinnedArticles: number;
    articlesWithAttachments: number;
  };
  newsStatsByVertical: NewsStatsByVertical[];
  recentRegistrations: { date: string; count: number }[];
  topUsers: TopUser[];
}

const ROLE_CHART_COLORS: Record<string, string> = {
  admin: "#51142a",
  corporate_admin: "#1e3a5f",
  defense_admin: "#2d4a3e",
  industrials_admin: "#5c4a1f",
  advanced_admin: "#3d2b5a",
  bou_admin: "#6b4423",
  bd_admin: "#1a4d5a",
  viewer: "#475569",
};

const VERTICAL_LABELS: Record<string, string> = {
  corporate: "Corporate",
  defense: "Defense",
  industrials: "Industrials",
  advanced_programs: "Advanced Programs",
};

const VERTICAL_COLORS: Record<string, string> = {
  corporate: "#51142a",
  defense: "#1e3a5f",
  industrials: "#5c4a1f",
  advanced_programs: "#3d2b5a",
};

const ROLES = [
  { id: "admin", name: "System Admin" },
  { id: "corporate_admin", name: "Corporate Admin" },
  { id: "defense_admin", name: "Defense Admin" },
  { id: "industrials_admin", name: "Industrials Admin" },
  { id: "advanced_admin", name: "Advanced Programs Admin" },
  { id: "bou_admin", name: "BOU Admin" },
  { id: "bd_admin", name: "BD Admin" },
  { id: "viewer", name: "Viewer" },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "System Admin",
  corporate_admin: "Corporate Admin",
  defense_admin: "Defense Admin",
  industrials_admin: "Industrials Admin",
  advanced_admin: "Advanced Programs Admin",
  bou_admin: "BOU Admin",
  bd_admin: "BD Admin",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  corporate_admin: "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  defense_admin: "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  industrials_admin: "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  advanced_admin: "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  bou_admin: "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  bd_admin: "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
  viewer: "bg-slate-100 text-slate-700 border border-slate-300",
};

export default function ControlPanel() {
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [editFirstName, setEditFirstName] = useState<string>("");
  const [editLastName, setEditLastName] = useState<string>("");
  const [editBusinessVertical, setEditBusinessVertical] = useState<string>("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.role === "admin",
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
    enabled: currentUser?.role === "admin",
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string; managedDivisions: string[]; firstName?: string; lastName?: string; businessVertical?: string }) => {
      return apiRequest("PATCH", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setEditingUser(null);
      toast({
        title: "User Updated",
        description: "User role and permissions have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <ShieldX className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access the System Control Panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setEditFirstName(user.firstName || "");
    setEditLastName(user.lastName || "");
    setEditBusinessVertical(user.businessVertical || "");
  };

  const handleSaveUser = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      userId: editingUser.id,
      role: selectedRole,
      managedDivisions: [],
      firstName: editFirstName,
      lastName: editLastName,
      businessVertical: editBusinessVertical,
    });
  };

  const roleChartData = analytics?.roleDistribution.map(item => ({
    name: ROLE_LABELS[item.role] || item.role,
    value: item.count,
    fill: ROLE_CHART_COLORS[item.role] || "#64748b"
  })) || [];

  const verticalChartData = analytics?.verticalDistribution.map(item => ({
    name: VERTICAL_LABELS[item.vertical] || item.vertical,
    value: item.count,
    fill: VERTICAL_COLORS[item.vertical] || "#64748b"
  })) || [];

  return (
    <div className="space-y-6">
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
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">System Control Panel</h1>
              <p className="text-white/80">
                Manage users, view analytics, and monitor platform activity
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full md:w-auto grid-cols-3 bg-muted/40 p-1 h-11">
          <TabsTrigger 
            value="analytics" 
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-muted-foreground transition-all" 
            data-testid="tab-analytics"
          >
            <BarChart3 className="w-4 h-4 hidden sm:inline" />
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-muted-foreground transition-all" 
            data-testid="tab-users"
          >
            <Users className="w-4 h-4 hidden sm:inline" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="knowledge" 
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-muted-foreground transition-all" 
            data-testid="tab-knowledge"
          >
            <Brain className="w-4 h-4 hidden sm:inline" />
            Knowledge
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <Card>
                  <CardContent className="p-3 md:p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold">{analytics?.totalUsers || 0}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Total Users</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 md:p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold">{analytics?.verifiedUsers || 0}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Verified</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 md:p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <UserX className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold">{analytics?.unverifiedUsers || 0}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 md:p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-bold">{analytics?.roleDistribution?.filter(r => r.role !== 'viewer').reduce((sum, r) => sum + r.count, 0) || 0}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">Admins</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Role Distribution
                    </CardTitle>
                    <CardDescription>Users by access level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {roleChartData.length > 0 ? (
                      <div className="h-[200px] md:h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={roleChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                              labelLine={false}
                            >
                              {roleChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        No role data available
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {roleChartData.map((item, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs"
                          style={{ borderColor: item.fill, color: item.fill }}
                        >
                          {item.name}: {item.value}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Business Vertical Distribution
                    </CardTitle>
                    <CardDescription>Users by division</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {verticalChartData.length > 0 ? (
                      <div className="h-[200px] md:h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={verticalChartData} layout="vertical">
                            <XAxis type="number" />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={100}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {verticalChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        No vertical data available yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Newspaper className="w-4 h-4" />
                    Bulletin Statistics by Vertical
                  </CardTitle>
                  <CardDescription>News and announcement metrics across all divisions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vertical</TableHead>
                          <TableHead className="text-center">Total Bulletins</TableHead>
                          <TableHead className="text-center">Pinned</TableHead>
                          <TableHead className="text-center">With Attachments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics?.newsStatsByVertical?.map((stat) => (
                          <TableRow key={stat.division}>
                            <TableCell className="font-medium">{VERTICAL_LABELS[stat.division] || stat.division}</TableCell>
                            <TableCell className="text-center">{stat.totalArticles}</TableCell>
                            <TableCell className="text-center">{stat.pinnedArticles}</TableCell>
                            <TableCell className="text-center">{stat.articlesWithAttachments}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-center">{analytics?.newsStats.totalArticles || 0}</TableCell>
                          <TableCell className="text-center">{analytics?.newsStats.pinnedArticles || 0}</TableCell>
                          <TableCell className="text-center">{analytics?.newsStats.articlesWithAttachments || 0}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    New Member Registrations
                  </CardTitle>
                  <CardDescription>User signups over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.recentRegistrations && analytics.recentRegistrations.length > 0 ? (
                    <div className="h-[250px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={[...analytics.recentRegistrations].reverse().map(r => ({
                            date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            registrations: r.count
                          }))}
                          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            allowDecimals={false}
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ fontWeight: 'bold' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="registrations" 
                            stroke="#51142a" 
                            strokeWidth={2}
                            dot={{ fill: '#51142a', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#51142a' }}
                            name="New Members"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No registration data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Top 10 Most Active Users
                  </CardTitle>
                  <CardDescription>Users ranked by number of sign-ins</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.topUsers && analytics.topUsers.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Business Unit</TableHead>
                            <TableHead className="text-right">Sign-ins</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.topUsers.map((user, index) => (
                            <TableRow key={user.id} data-testid={`row-top-user-${user.id}`}>
                              <TableCell className="font-medium">
                                {index === 0 ? (
                                  <span className="text-amber-500 font-bold">1</span>
                                ) : index === 1 ? (
                                  <span className="text-slate-400 font-bold">2</span>
                                ) : index === 2 ? (
                                  <span className="text-amber-700 font-bold">3</span>
                                ) : (
                                  index + 1
                                )}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {user.firstName && user.lastName 
                                      ? `${user.firstName} ${user.lastName}` 
                                      : user.email.split('@')[0]}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {user.businessVertical ? VERTICAL_LABELS[user.businessVertical] || user.businessVertical : "—"}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {user.loginCount}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No login data available yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="users">
          <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Search and manage user roles and division assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[220px]" data-testid="select-role-filter">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Business Unit</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers?.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {user.firstName?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-business-unit-${user.id}`}>
                          {user.businessVertical ? VERTICAL_LABELS[user.businessVertical] || user.businessVertical : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={ROLE_COLORS[user.role] || ROLE_COLORS.viewer}>
                            {ROLE_LABELS[user.role] || "Viewer"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm" data-testid={`text-created-${user.id}`}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditUser(user)}
                                disabled={user.id === currentUser?.id}
                                data-testid={`button-edit-user-${user.id}`}
                                data-goatcounter-click="admin-edit-user"
                                data-goatcounter-title="Edit user profile and role"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User Profile</DialogTitle>
                                <DialogDescription>
                                  Update profile for {editingUser?.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input
                                      value={editFirstName}
                                      onChange={(e) => setEditFirstName(e.target.value)}
                                      placeholder="First name"
                                      data-testid="input-edit-first-name"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input
                                      value={editLastName}
                                      onChange={(e) => setEditLastName(e.target.value)}
                                      placeholder="Last name"
                                      data-testid="input-edit-last-name"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Business Unit</Label>
                                  <Select value={editBusinessVertical} onValueChange={setEditBusinessVertical}>
                                    <SelectTrigger data-testid="select-business-unit">
                                      <SelectValue placeholder="Select business unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="corporate">Corporate</SelectItem>
                                      <SelectItem value="defense">Defense</SelectItem>
                                      <SelectItem value="industrials">Industrials</SelectItem>
                                      <SelectItem value="advanced_programs">Advanced Programs</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Role</Label>
                                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger data-testid="select-user-role">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ROLES.map((role) => (
                                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={handleSaveUser}
                                  disabled={updateUserMutation.isPending}
                                  data-testid="button-save-user"
                                  data-goatcounter-click="admin-save-user"
                                  data-goatcounter-title="Save user profile changes"
                                >
                                  {updateUserMutation.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Save Changes"
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          <KnowledgeBaseAdmin />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
