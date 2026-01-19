import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search,
  Clock,
  Filter,
  Archive,
  FileUp,
  FileText,
  Building2,
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  Eye,
  EyeOff,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Calendar,
  MapPin,
  DollarSign,
  Sparkles,
  Target,
  FileSpreadsheet,
  ChevronDown,
  ExternalLink,
  Settings,
  Mail,
  MailCheck,
  Hash,
  Shield,
  Trash2,
  BarChart3,
  Users,
  Activity,
  MessageSquare,
  Heart,
  Reply,
  AtSign,
  Send,
  CornerDownRight,
  HelpCircle,
  Lightbulb,
  ListChecks,
  Brain,
  Layers
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import heroImage from "@assets/29670_1765410593099.jpg";

interface IdiqOpportunity {
  id: string;
  sourceType: 'upload' | 'email' | 'portal';
  title: string;
  description: string | null;
  contractVehicle: string | null;
  opportunityType: string | null;
  agency: string | null;
  postedDate: string | null;
  dueDate: string | null;
  naicsCode: string | null;
  setAsideType: string | null;
  estimatedValue: string | null;
  placeOfPerformance: string | null;
  solicitationNumber: string | null;
  originalUrl: string | null;
  matchScore: number | null;
  relevancySummary: string | null;
  whyRelevant: string | null;
  pastPerformanceMatch: string | null;
  capabilityMatch: string[] | null;
  requirements: string[] | null;
  discriminatorsStrengths: string[] | null;
  discriminatorsWeaknesses: string[] | null;
  tags: string[] | null;
  aiCategory: string | null;
  status: 'new' | 'reviewed' | 'saved' | 'archived';
  viewCount: number;
  createdAt: string;
}

interface UserFeedback {
  feedbackType: 'upvote' | 'downvote';
  reason: string | null;
  createdAt: string;
}

interface FeedbackCounts {
  upvotes: number;
  downvotes: number;
}

interface UserNote {
  id: string;
  noteText: string;
  createdAt: string;
  updatedAt: string;
  authorName: string;
}

interface Comment {
  id: string;
  userId: string;
  opportunityId: string;
  parentId: string | null;
  content: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorFirstName: string | null;
  authorLastName: string | null;
  likeCount: number;
  likedByMe: boolean;
  isOwner: boolean;
}

interface MentionUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  displayName: string;
}

interface IdiqStats {
  total: number;
  unread: number;
  matched: number;
  saved: number;
  defense: number;
  industrials: number;
  advancedPrograms: number;
}

interface IdiqUploadBatch {
  id: string;
  fileName: string;
  totalOpportunities: number;
  processedOpportunities: number;
  status: string;
  createdAt: string;
}

interface IdiqCapabilityDoc {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  isActive: boolean;
  createdAt: string;
}

interface IdiqSettings {
  minMatchThreshold: number;
  emailNotificationsEnabled: boolean;
  notificationEmail: string | null;
  notifyOnHighMatch: boolean;
  highMatchThreshold: number;
  autoArchiveBelowThreshold: boolean;
  businessUnitFilter: string | null;
}

interface GlobalIdiqSettings {
  minMatchThreshold: number;
  autoArchiveBelowThreshold: boolean;
}

interface EmailIngest {
  id: string;
  fromAddress: string;
  subject: string | null;
  receivedAt: string;
  status: string;
  detectedPortal: string | null;
  opportunitiesFound: number;
  opportunitiesAboveThreshold: number;
  errorMessage: string | null;
  processedAt: string | null;
}

interface UserAnalytics {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  businessVertical: string | null;
  opportunitiesOpened: number;
  feedbackGiven: number;
  notesCreated: number;
  lastActivity: string | null;
}

interface AnalyticsSummary {
  usersOpenedOpps: number;
  usersGaveFeedback: number;
  totalOpportunitiesOpened: number;
  totalFeedbackGiven: number;
  totalUpvotes: number;
  totalDownvotes: number;
  totalNotesCreated: number;
}

interface UserAnalyticsResponse {
  users: UserAnalytics[];
  summary: AnalyticsSummary;
}

export default function IdiqManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isBdAdmin = user?.role === 'bd_admin';
  const canViewAnalytics = isAdmin || isBdAdmin;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("90");
  const [scoreFilter, setScoreFilter] = useState("0");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [businessUnitFilterBar, setBusinessUnitFilterBar] = useState("all");
  const [naicsCodeFilter, setNaicsCodeFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCapabilityDialog, setShowCapabilityDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<IdiqOpportunity | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const capabilityFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  
  // Feedback states
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'upvote' | 'downvote'>('upvote');
  const [feedbackReason, setFeedbackReason] = useState("");
  
  // Notes state
  const [newNoteText, setNewNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  
  // Social comments state
  const [newCommentText, setNewCommentText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [replyMentionQuery, setReplyMentionQuery] = useState("");
  const [showReplyMentions, setShowReplyMentions] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [replySelectedMentions, setReplySelectedMentions] = useState<string[]>([]);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  
  // Settings state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [showHowItWorksDialog, setShowHowItWorksDialog] = useState(false);
  const [localSettings, setLocalSettings] = useState<IdiqSettings>({
    minMatchThreshold: 70,
    emailNotificationsEnabled: false,
    notificationEmail: null,
    notifyOnHighMatch: true,
    highMatchThreshold: 85,
    autoArchiveBelowThreshold: false,
    businessUnitFilter: null,
  });
  const [localGlobalSettings, setLocalGlobalSettings] = useState<GlobalIdiqSettings>({
    minMatchThreshold: 70,
    autoArchiveBelowThreshold: false,
  });

  // Build query string for opportunities
  const buildOpportunitiesUrl = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (timeFilter) params.append('days', timeFilter);
    if (scoreFilter && scoreFilter !== '0') params.append('minScore', scoreFilter);
    if (sourceFilter && sourceFilter !== 'all') params.append('source', sourceFilter);
    if (businessUnitFilterBar && businessUnitFilterBar !== 'all') params.append('businessUnit', businessUnitFilterBar);
    if (naicsCodeFilter && naicsCodeFilter.trim()) params.append('naicsCode', naicsCodeFilter.trim());
    if (showArchived) params.append('showArchived', 'true');
    if (unreadOnly) params.append('unreadOnly', 'true');
    if (savedOnly) params.append('savedOnly', 'true');
    const queryString = params.toString();
    return queryString ? `/api/idiq/opportunities?${queryString}` : '/api/idiq/opportunities';
  };

  // Fetch opportunities
  const { data: opportunities, isLoading: loadingOpportunities, refetch } = useQuery<IdiqOpportunity[]>({
    queryKey: ['/api/idiq/opportunities', searchQuery, timeFilter, scoreFilter, sourceFilter, businessUnitFilterBar, naicsCodeFilter, showArchived, unreadOnly, savedOnly],
    queryFn: async () => {
      const response = await fetch(buildOpportunitiesUrl(), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch opportunities');
      return response.json();
    },
  });

  // Fetch stats
  const { data: stats, isLoading: loadingStats } = useQuery<IdiqStats>({
    queryKey: ['/api/idiq/stats'],
  });

  // Fetch upload batches
  const { data: batches } = useQuery<IdiqUploadBatch[]>({
    queryKey: ['/api/idiq/batches'],
  });

  // Fetch capability documents
  const { data: capabilityDocs } = useQuery<IdiqCapabilityDoc[]>({
    queryKey: ['/api/idiq/capability-docs'],
  });

  // Fetch user IDIQ settings
  const { data: settings } = useQuery<IdiqSettings>({
    queryKey: ['/api/idiq/settings'],
  });

  // Fetch global IDIQ settings (for admin section only)
  const { data: globalSettings } = useQuery<GlobalIdiqSettings>({
    queryKey: ['/api/idiq/global-settings'],
    enabled: isAdmin, // Only fetch for admins
  });

  // Fetch email ingestion history
  const { data: emailIngests } = useQuery<EmailIngest[]>({
    queryKey: ['/api/idiq/email-ingests'],
  });

  // Fetch user analytics (admin/bd_admin only)
  const { data: userAnalytics, isLoading: loadingAnalytics } = useQuery<UserAnalyticsResponse>({
    queryKey: ['/api/idiq/user-analytics'],
    enabled: canViewAnalytics && showAnalyticsDialog,
  });

  // Sync local settings when loaded
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Sync local global settings when loaded
  useEffect(() => {
    if (globalSettings) {
      setLocalGlobalSettings(globalSettings);
    }
  }, [globalSettings]);

  // Update user settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<IdiqSettings>) => {
      return apiRequest("PATCH", "/api/idiq/settings", newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/settings'] });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  // Update global settings mutation (admin only)
  const updateGlobalSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<GlobalIdiqSettings>) => {
      return apiRequest("PATCH", "/api/idiq/global-settings", newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/global-settings'] });
    },
    onError: () => {
      toast({ title: "Failed to update global settings", variant: "destructive" });
    },
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return apiRequest("DELETE", `/api/idiq/batches/${batchId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/stats'] });
      toast({ title: "Spreadsheet and opportunities deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete spreadsheet", variant: "destructive" });
    },
  });
  
  // Combined save handler for settings dialog
  const handleSaveSettings = async () => {
    try {
      // Save user settings
      await updateSettingsMutation.mutateAsync(localSettings);
      
      // Save global settings if admin (re-check isAdmin at save time for safety)
      if (user?.role === 'admin') {
        await updateGlobalSettingsMutation.mutateAsync(localGlobalSettings);
      }
      
      toast({ title: "Settings saved successfully" });
      setShowSettingsDialog(false);
    } catch {
      // Error is already handled by individual mutations
    }
  };

  // Fetch user's read status for all opportunities
  const { data: readStatus } = useQuery<Record<string, string>>({
    queryKey: ['/api/idiq/read-status'],
  });

  // Fetch user's feedback for selected opportunity
  const { data: userFeedback, refetch: refetchFeedback } = useQuery<UserFeedback | null>({
    queryKey: ['/api/idiq/opportunities', selectedOpportunity?.id, 'feedback'],
    queryFn: async () => {
      if (!selectedOpportunity) return null;
      const response = await fetch(`/api/idiq/opportunities/${selectedOpportunity.id}/feedback`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch feedback');
      return response.json();
    },
    enabled: !!selectedOpportunity,
  });

  // Fetch feedback counts for selected opportunity
  const { data: feedbackCounts, refetch: refetchFeedbackCounts } = useQuery<FeedbackCounts>({
    queryKey: ['/api/idiq/opportunities', selectedOpportunity?.id, 'feedback-counts'],
    queryFn: async () => {
      if (!selectedOpportunity) return { upvotes: 0, downvotes: 0 };
      const response = await fetch(`/api/idiq/opportunities/${selectedOpportunity.id}/feedback-counts`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch feedback counts');
      return response.json();
    },
    enabled: !!selectedOpportunity,
  });

  // Fetch user's notes for selected opportunity
  const { data: userNotes, refetch: refetchNotes } = useQuery<UserNote[]>({
    queryKey: ['/api/idiq/opportunities', selectedOpportunity?.id, 'notes'],
    queryFn: async () => {
      if (!selectedOpportunity) return [];
      const response = await fetch(`/api/idiq/opportunities/${selectedOpportunity.id}/notes`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
    enabled: !!selectedOpportunity,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/idiq/opportunities/${id}/status`, { status });
    },
    onSuccess: () => {
      // Invalidate all opportunity queries (with any filter combination)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === '/api/idiq/opportunities' || key === '/api/idiq/stats';
        }
      });
      toast({ title: "Status updated" });
    },
  });

  // Record view mutation
  const recordViewMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/idiq/opportunities/${id}/view`, {});
    },
    onSuccess: () => {
      // Invalidate all opportunity queries (with any filter combination)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return key === '/api/idiq/opportunities' || key === '/api/idiq/stats';
        }
      });
    },
  });

  // Mark as read mutation (for per-user read tracking)
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/idiq/opportunities/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/read-status'] });
    },
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ id, feedbackType, reason }: { id: string; feedbackType: 'upvote' | 'downvote'; reason: string }) => {
      return apiRequest("POST", `/api/idiq/opportunities/${id}/feedback`, { feedbackType, reason });
    },
    onSuccess: () => {
      refetchFeedback();
      refetchFeedbackCounts();
      toast({ title: "Feedback submitted", description: "Thank you! Your feedback helps improve AI scoring." });
      setShowFeedbackDialog(false);
      setFeedbackReason("");
    },
  });

  // Delete feedback mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/idiq/opportunities/${id}/feedback`, {});
    },
    onSuccess: () => {
      refetchFeedback();
      refetchFeedbackCounts();
      toast({ title: "Feedback removed" });
    },
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async ({ id, noteText }: { id: string; noteText: string }) => {
      return apiRequest("POST", `/api/idiq/opportunities/${id}/notes`, { noteText });
    },
    onSuccess: () => {
      refetchNotes();
      setNewNoteText("");
      toast({ title: "Note added" });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ opportunityId, noteId, noteText }: { opportunityId: string; noteId: string; noteText: string }) => {
      return apiRequest("PATCH", `/api/idiq/opportunities/${opportunityId}/notes/${noteId}`, { noteText });
    },
    onSuccess: () => {
      refetchNotes();
      setEditingNoteId(null);
      setEditingNoteText("");
      toast({ title: "Note updated" });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async ({ opportunityId, noteId }: { opportunityId: string; noteId: string }) => {
      return apiRequest("DELETE", `/api/idiq/opportunities/${opportunityId}/notes/${noteId}`, {});
    },
    onSuccess: () => {
      refetchNotes();
      toast({ title: "Note deleted" });
    },
  });

  // ============ Social Comments ============
  
  // Fetch comments for selected opportunity
  const { data: comments, refetch: refetchComments } = useQuery<Comment[]>({
    queryKey: ['/api/idiq/opportunities', selectedOpportunity?.id, 'comments'],
    queryFn: async () => {
      if (!selectedOpportunity) return [];
      const response = await fetch(`/api/idiq/opportunities/${selectedOpportunity.id}/comments`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!selectedOpportunity,
  });

  // Search users for @mentions
  const activeMentionQuery = showMentions ? mentionQuery : (showReplyMentions ? replyMentionQuery : "");
  const { data: mentionUsers } = useQuery<MentionUser[]>({
    queryKey: ['/api/idiq/users/search', activeMentionQuery],
    queryFn: async () => {
      if (!activeMentionQuery) return [];
      const response = await fetch(`/api/idiq/users/search?q=${encodeURIComponent(activeMentionQuery)}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to search users');
      return response.json();
    },
    enabled: activeMentionQuery.length >= 1,
  });

  // Handle comment input change with @mention detection
  const handleCommentInputChange = (value: string) => {
    setNewCommentText(value);
    const cursorPos = commentInputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  // Handle reply input change with @mention detection
  const handleReplyInputChange = (value: string) => {
    setReplyText(value);
    const cursorPos = replyInputRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z]*)$/);
    if (mentionMatch) {
      setReplyMentionQuery(mentionMatch[1]);
      setShowReplyMentions(true);
    } else {
      setShowReplyMentions(false);
      setReplyMentionQuery("");
    }
  };

  // Handle mention selection for main comment
  const handleMentionSelect = (user: MentionUser) => {
    const cursorPos = commentInputRef.current?.selectionStart || newCommentText.length;
    const textBeforeCursor = newCommentText.slice(0, cursorPos);
    const textAfterCursor = newCommentText.slice(cursorPos);
    const newTextBefore = textBeforeCursor.replace(/@[a-zA-Z]*$/, `@${user.displayName} `);
    setNewCommentText(newTextBefore + textAfterCursor);
    setShowMentions(false);
    setMentionQuery("");
    if (!selectedMentions.includes(user.id)) {
      setSelectedMentions([...selectedMentions, user.id]);
    }
    commentInputRef.current?.focus();
  };

  // Handle mention selection for replies
  const handleReplyMentionSelect = (user: MentionUser) => {
    const cursorPos = replyInputRef.current?.selectionStart || replyText.length;
    const textBeforeCursor = replyText.slice(0, cursorPos);
    const textAfterCursor = replyText.slice(cursorPos);
    const newTextBefore = textBeforeCursor.replace(/@[a-zA-Z]*$/, `@${user.displayName} `);
    setReplyText(newTextBefore + textAfterCursor);
    setShowReplyMentions(false);
    setReplyMentionQuery("");
    if (!replySelectedMentions.includes(user.id)) {
      setReplySelectedMentions([...replySelectedMentions, user.id]);
    }
    replyInputRef.current?.focus();
  };

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ id, content, parentId, mentions }: { id: string; content: string; parentId?: string; mentions?: string[] }) => {
      return apiRequest("POST", `/api/idiq/opportunities/${id}/comments`, { content, parentId, mentions });
    },
    onSuccess: () => {
      refetchComments();
      setNewCommentText("");
      setReplyingToId(null);
      setReplyText("");
      setSelectedMentions([]);
      setReplySelectedMentions([]);
      toast({ title: "Comment added" });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async ({ opportunityId, commentId }: { opportunityId: string; commentId: string }) => {
      return apiRequest("DELETE", `/api/idiq/opportunities/${opportunityId}/comments/${commentId}`, {});
    },
    onSuccess: () => {
      refetchComments();
      toast({ title: "Comment deleted" });
    },
  });

  // Like comment mutation
  const likeCommentMutation = useMutation({
    mutationFn: async ({ commentId, liked }: { commentId: string; liked: boolean }) => {
      if (liked) {
        return apiRequest("DELETE", `/api/idiq/comments/${commentId}/like`, {});
      } else {
        return apiRequest("POST", `/api/idiq/comments/${commentId}/like`, {});
      }
    },
    onSuccess: () => {
      refetchComments();
    },
  });

  // Build comment tree (top-level and replies)
  const topLevelComments = comments?.filter(c => !c.parentId) || [];
  const getReplies = (parentId: string) => comments?.filter(c => c.parentId === parentId) || [];

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/idiq/mark-all-read`, {});
    },
    onSuccess: () => {
      // Invalidate both read status and stats
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/read-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/stats'] });
      toast({ title: "All marked as read" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/idiq/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Upload failed");

      toast({ title: "Upload successful", description: "Processing Task Order list..." });
      setShowUploadDialog(false);
      // Invalidate all IDIQ-related queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/idiq/');
        }
      });
    } catch (error) {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCapabilityUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/idiq/capability-docs", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) throw new Error("Upload failed");

      toast({ title: "Capability document uploaded", description: "AI scoring will now use this context." });
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/capability-docs'] });
    } catch (error) {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (capabilityFileInputRef.current) capabilityFileInputRef.current.value = "";
    }
  };

  const handleRescoreAll = async () => {
    setIsRescoring(true);
    try {
      const response = await fetch("/api/idiq/rescore-all", {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Re-scoring failed");
      
      const result = await response.json();
      toast({ 
        title: "Re-scoring complete", 
        description: `${result.rescored} opportunities have been re-assessed with updated capability documents.` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/idiq/opportunities'] });
    } catch (error) {
      toast({ title: "Re-scoring failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsRescoring(false);
    }
  };

  const handleViewOpportunity = (opp: IdiqOpportunity) => {
    setSelectedOpportunity(opp);
    // Mark as read for this user
    if (!readStatus?.[opp.id]) {
      markAsReadMutation.mutate(opp.id);
    }
    if (opp.status === 'new') {
      recordViewMutation.mutate(opp.id);
    }
  };

  // Helper to check if opportunity is unread for current user
  const isUnread = (opportunityId: string) => {
    return !readStatus?.[opportunityId];
  };

  // Count unread opportunities
  const unreadCount = opportunities?.filter(opp => isUnread(opp.id)).length || 0;

  // Handle feedback submission
  const handleSubmitFeedback = () => {
    if (!selectedOpportunity) return;
    submitFeedbackMutation.mutate({
      id: selectedOpportunity.id,
      feedbackType,
      reason: feedbackReason,
    });
  };

  // Handle opening feedback dialog
  const openFeedbackDialog = (type: 'upvote' | 'downvote') => {
    setFeedbackType(type);
    setFeedbackReason("");
    setShowFeedbackDialog(true);
  };

  const getScoreBadgeColor = (score: number | null) => {
    if (!score) return "bg-muted text-muted-foreground";
    if (score >= 85) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    if (score >= 75) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (score >= 60) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-muted text-muted-foreground";
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'upload': return <FileSpreadsheet className="w-4 h-4" />;
      case 'email': return <FileText className="w-4 h-4" />;
      case 'portal': return <Building2 className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'upload': return "Uploaded List";
      case 'email': return "Email Forward";
      case 'portal': return "Gov Portal";
      default: return source;
    }
  };

  // Handle stat filter tile clicks
  const handleStatFilterClick = (filterType: string) => {
    // If clicking the same filter, clear it (toggle off)
    if (activeStatFilter === filterType) {
      setActiveStatFilter(null);
      setBusinessUnitFilterBar("all");
      setUnreadOnly(false);
      setSavedOnly(false);
      return;
    }

    // Set new filter
    setActiveStatFilter(filterType);
    
    // Reset all filters first
    setBusinessUnitFilterBar("all");
    setUnreadOnly(false);
    setSavedOnly(false);

    // Apply the specific filter
    switch (filterType) {
      case 'total':
        // No filter - show all
        break;
      case 'unread':
        setUnreadOnly(true);
        break;
      case 'defense':
        setBusinessUnitFilterBar("defense");
        break;
      case 'industrials':
        setBusinessUnitFilterBar("industrials");
        break;
      case 'advanced_programs':
        setBusinessUnitFilterBar("advanced_programs");
        break;
      case 'saved':
        setSavedOnly(true);
        break;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Header - Matching Defense News Feed Style */}
      <div className="relative h-56 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#51142a]/90 via-[#51142a]/80 to-[#0E2841]/70" />
        <div className="relative z-10 h-full flex flex-col justify-center px-6 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Badge 
                variant="outline" 
                className="bg-white/10 text-white border-white/20 mb-3"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                INTELLIGENCE MODULE
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                IDIQ Management Portal
              </h1>
              <p className="text-white/80 mt-2 max-w-xl">
                A triage and discipline tool — not a capture system. It keeps us from wasting time 
                and lets capture focus on what actually fits.
              </p>
            </div>
            <div className="hidden md:flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHowItWorksDialog(true)}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                data-testid="button-how-it-works"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                How it Works
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowCapabilityDialog(true)}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-manage-capabilities"
              >
                <Target className="w-4 h-4 mr-2" />
                Capabilities
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettingsDialog(true)}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                data-testid="button-idiq-settings"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              {canViewAnalytics && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnalyticsDialog(true)}
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                  data-testid="button-idiq-analytics"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto space-y-6">
        {/* Search and Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search all opportunities (including archived)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-idiq"
            />
          </div>
          <Button
            variant="default"
            onClick={() => {}}
            data-testid="button-search-idiq"
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-time-filter">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-[130px]" data-testid="select-score-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Scores</SelectItem>
              <SelectItem value="60">60%+</SelectItem>
              <SelectItem value="70">70%+</SelectItem>
              <SelectItem value="75">75%+</SelectItem>
              <SelectItem value="85">85%+</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-source-filter">
              <FileText className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="upload">Uploaded Lists</SelectItem>
              <SelectItem value="email">Email Forward</SelectItem>
              <SelectItem value="portal">Gov Portal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={businessUnitFilterBar} onValueChange={setBusinessUnitFilterBar}>
            <SelectTrigger className="w-[160px]" data-testid="select-business-unit-bar">
              <Building2 className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Business Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Business Units</SelectItem>
              <SelectItem value="defense">Defense</SelectItem>
              <SelectItem value="industrials">Industrials</SelectItem>
              <SelectItem value="advanced_programs">Advanced Programs</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="NAICS Code"
              value={naicsCodeFilter}
              onChange={(e) => setNaicsCodeFilter(e.target.value)}
              className="w-[130px] pl-9"
              data-testid="input-naics-filter"
            />
          </div>
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            data-testid="button-toggle-archived"
          >
            <Archive className="w-4 h-4 mr-2" />
            Show Archived
          </Button>
        </div>

        {/* Stats Summary Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatTile 
            icon={<FileText className="w-5 h-5" />}
            value={stats?.total ?? 0}
            label="Total Task Orders"
            isLoading={loadingStats}
            onClick={() => handleStatFilterClick('total')}
            isActive={activeStatFilter === 'total'}
          />
          <StatTile 
            icon={<EyeOff className="w-5 h-5" />}
            value={stats?.unread ?? 0}
            label="Unread"
            isLoading={loadingStats}
            onClick={() => handleStatFilterClick('unread')}
            isActive={activeStatFilter === 'unread'}
          />
          <StatTile 
            icon={<Building2 className="w-5 h-5" />}
            value={stats?.defense ?? 0}
            label="Defense"
            isLoading={loadingStats}
            onClick={() => handleStatFilterClick('defense')}
            isActive={activeStatFilter === 'defense'}
          />
          <StatTile 
            icon={<Factory className="w-5 h-5" />}
            value={stats?.industrials ?? 0}
            label="Industrials"
            isLoading={loadingStats}
            onClick={() => handleStatFilterClick('industrials')}
            isActive={activeStatFilter === 'industrials'}
          />
          <StatTile 
            icon={<TrendingUp className="w-5 h-5" />}
            value={stats?.advancedPrograms ?? 0}
            label="Advanced Programs"
            isLoading={loadingStats}
            onClick={() => handleStatFilterClick('advanced_programs')}
            isActive={activeStatFilter === 'advanced_programs'}
          />
          <StatTile 
            icon={<BookmarkCheck className="w-5 h-5" />}
            value={stats?.saved ?? 0}
            label="Saved"
            isLoading={loadingStats}
            onClick={() => handleStatFilterClick('saved')}
            isActive={activeStatFilter === 'saved'}
          />
        </div>

        {/* Upload Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Opportunities</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark All as Read
              </Button>
            )}
            <Button
              onClick={() => setShowUploadDialog(true)}
              data-testid="button-upload-task-order"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Task Order List
            </Button>
          </div>
        </div>

        {/* Opportunity Cards */}
        <div className="space-y-4">
          {loadingOpportunities ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))
          ) : opportunities && opportunities.length > 0 ? (
            opportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onView={() => handleViewOpportunity(opp)}
                onSave={() => updateStatusMutation.mutate({ id: opp.id, status: opp.status === 'saved' ? 'reviewed' : 'saved' })}
                onArchive={() => updateStatusMutation.mutate({ id: opp.id, status: 'archived' })}
                getScoreBadgeColor={getScoreBadgeColor}
                getSourceIcon={getSourceIcon}
                getSourceLabel={getSourceLabel}
                isUnread={isUnread(opp.id)}
              />
            ))
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No opportunities yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Upload a Task Order list to get started. The AI will analyze each opportunity 
                  against Albers' capabilities and past performance.
                </p>
                <Button onClick={() => setShowUploadDialog(true)} data-testid="button-upload-first">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First List
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Task Order List</DialogTitle>
            <DialogDescription>
              Upload an Excel, CSV, PDF, or Word document containing Task Order opportunities. 
              The AI will parse and score each opportunity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Supported formats: .xlsx, .csv, .pdf, .docx
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file-upload"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Select File
                  </>
                )}
              </Button>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600">CUI Warning</p>
                  <p className="text-muted-foreground">
                    Do not upload documents containing Controlled Unclassified Information (CUI).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Capability Documents Dialog */}
      <Dialog open={showCapabilityDialog} onOpenChange={setShowCapabilityDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capability Documents</DialogTitle>
            <DialogDescription>
              Upload past performance, capabilities statements, and other reference documents. 
              The AI uses these to contextually score opportunities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                ref={capabilityFileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls"
                onChange={handleCapabilityUpload}
                className="hidden"
                data-testid="input-capability-upload"
              />
              <Button 
                variant="outline"
                onClick={() => capabilityFileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New Document
                  </>
                )}
              </Button>
            </div>
            
            {capabilityDocs && capabilityDocs.length > 0 && (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {capabilityDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                        </div>
                      </div>
                      <Badge variant={doc.isActive ? "default" : "secondary"}>
                        {doc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {/* Re-score button */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Re-assess Opportunities</p>
                  <p className="text-xs text-muted-foreground">
                    Re-score all opportunities using updated capability documents
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleRescoreAll}
                  disabled={isRescoring}
                  data-testid="button-rescore-all"
                >
                  {isRescoring ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Re-scoring...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-score All
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* How it Works Dialog */}
      <Dialog open={showHowItWorksDialog} onOpenChange={setShowHowItWorksDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <HelpCircle className="w-5 h-5 text-primary" />
              How the IDIQ Management Portal Works
            </DialogTitle>
            <DialogDescription>
              A guide for capture managers to understand this triage tool
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Purpose Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base">What This Tool Is</h3>
              </div>
              <p className="text-sm text-muted-foreground pl-7">
                This is a <strong>triage and discipline tool</strong> — not a capture system. Its purpose is to help you 
                quickly identify which Task Order opportunities are worth your time and which ones aren't. 
                It keeps us from wasting effort on poor-fit opportunities and lets capture focus on what actually fits.
              </p>
            </div>

            {/* Data Sources Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base">Where Opportunities Come From</h3>
              </div>
              <div className="pl-7 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Opportunities are ingested from multiple sources:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li><strong>Email Ingestion:</strong> Forwarded emails from SAM.gov, DIBBS, PIEE, GovWin, and other government portals</li>
                  <li><strong>Manual Uploads:</strong> Excel/CSV files containing Task Order lists from contract vehicles</li>
                  <li><strong>Business Intelligence:</strong> Integrated feeds from market intelligence platforms</li>
                </ul>
              </div>
            </div>

            {/* AI Scoring Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base">How AI Scoring Works</h3>
              </div>
              <div className="pl-7 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Each opportunity receives a <strong>Match Score (0-100)</strong> calculated by AI based on:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li><strong>Past Performance:</strong> How well our contract history aligns with the requirement</li>
                  <li><strong>Capability Match:</strong> Whether we have the technical capabilities being requested</li>
                  <li><strong>Business Unit Fit:</strong> Which division (Defense, Industrials, Advanced Programs) is best suited</li>
                  <li><strong>Requirements Analysis:</strong> Key requirements extracted from the solicitation</li>
                  <li><strong>Discriminators:</strong> Identified strengths and potential challenges</li>
                </ul>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Important:</strong> AI scores are preliminary assessments based on available past performance 
                      and publicly supported programs. Always validate recommendations before committing resources.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Interpretation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base">Interpreting Match Scores</h3>
              </div>
              <div className="pl-7 grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-emerald-600 mb-1">85-100</div>
                  <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Strong Fit</div>
                  <p className="text-xs text-muted-foreground mt-1">High alignment with our capabilities. Worth immediate attention.</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-amber-600 mb-1">70-84</div>
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Moderate Fit</div>
                  <p className="text-xs text-muted-foreground mt-1">Some alignment. Review for strategic fit or teaming opportunities.</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-500 mb-1">&lt;70</div>
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Low Fit</div>
                  <p className="text-xs text-muted-foreground mt-1">Limited alignment. Usually not worth pursuing unless strategic.</p>
                </div>
              </div>
            </div>

            {/* Feedback & Learning */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base">Your Feedback Improves Scoring</h3>
              </div>
              <div className="pl-7 space-y-2">
                <p className="text-sm text-muted-foreground">
                  When you upvote or downvote an opportunity, you're teaching the system. Your feedback helps:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li>Refine future scoring accuracy for similar opportunities</li>
                  <li>Identify patterns the AI may have missed</li>
                  <li>Build institutional knowledge about what works for Albers</li>
                </ul>
              </div>
            </div>

            {/* Features Overview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base">Key Features</h3>
              </div>
              <div className="pl-7 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <Bookmark className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Save for Later</span>
                    <p className="text-xs text-muted-foreground">Bookmark opportunities you want to revisit</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Team Discussion</span>
                    <p className="text-xs text-muted-foreground">Comment and @mention colleagues</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Private Notes</span>
                    <p className="text-xs text-muted-foreground">Add personal notes only you can see</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Email Alerts</span>
                    <p className="text-xs text-muted-foreground">Get notified about high-scoring matches</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHowItWorksDialog(false)} data-testid="button-close-how-it-works">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>IDIQ Portal Settings</DialogTitle>
            <DialogDescription>
              Configure notification preferences and filters for the IDIQ Intelligence Feed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* System Admin Section - Only visible to admins */}
            {isAdmin && (
              <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">System Admin Settings</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  These settings apply to all users and control which opportunities are stored in the system.
                </p>
                
                {/* Global Minimum Match Threshold */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Opportunity Scrub Threshold</Label>
                      <p className="text-xs text-muted-foreground">
                        Opportunities scoring below this threshold will not be stored. This applies to all ingested opportunities.
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-primary">{localGlobalSettings.minMatchThreshold}%</span>
                  </div>
                  <Slider
                    value={[localGlobalSettings.minMatchThreshold]}
                    onValueChange={(value) => setLocalGlobalSettings({ ...localGlobalSettings, minMatchThreshold: value[0] })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                    data-testid="slider-global-threshold"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0% (Store all)</span>
                    <span>50%</span>
                    <span>100% (High relevance only)</span>
                  </div>
                </div>
              </div>
            )}

            {/* User Settings Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <Label className="text-base font-semibold">Your Notification Settings</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Configure your personal email notifications for new opportunities.
              </p>

              {/* Email Notifications */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive email alerts when new high-scoring opportunities are ingested.
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.emailNotificationsEnabled}
                    onCheckedChange={(checked) => setLocalSettings({ ...localSettings, emailNotificationsEnabled: checked })}
                    data-testid="switch-email-notifications"
                  />
                </div>

                {localSettings.emailNotificationsEnabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    <div className="space-y-2">
                      <Label className="text-sm">Notification Email Address</Label>
                      <p className="text-xs text-muted-foreground">
                        Enter the email address where you'd like to receive notifications.
                      </p>
                      <Input
                        type="email"
                        placeholder="your.email@albers.aero"
                        value={localSettings.notificationEmail || ""}
                        onChange={(e) => setLocalSettings({ ...localSettings, notificationEmail: e.target.value || null })}
                        data-testid="input-notification-email"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm">High Match Alert Threshold</Label>
                        <p className="text-xs text-muted-foreground">
                          Only notify for opportunities above this score.
                        </p>
                      </div>
                      <span className="text-lg font-bold">{localSettings.highMatchThreshold}%</span>
                    </div>
                    <Slider
                      value={[localSettings.highMatchThreshold]}
                      onValueChange={(value) => setLocalSettings({ ...localSettings, highMatchThreshold: value[0] })}
                      min={50}
                      max={100}
                      step={5}
                      className="w-full"
                      data-testid="slider-high-threshold"
                    />
                    
                    {/* Business Unit Filter for Notifications */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-sm">Business Unit Filter</Label>
                      <p className="text-xs text-muted-foreground">
                        Only receive notifications for opportunities matching this business unit.
                      </p>
                      <Select
                        value={localSettings.businessUnitFilter || "all"}
                        onValueChange={(value) => setLocalSettings({ ...localSettings, businessUnitFilter: value === "all" ? null : value })}
                      >
                        <SelectTrigger data-testid="select-business-unit-filter">
                          <SelectValue placeholder="All Business Units" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Business Units</SelectItem>
                          <SelectItem value="defense">Defense</SelectItem>
                          <SelectItem value="industrials">Industrials</SelectItem>
                          <SelectItem value="advanced_programs">Advanced Programs</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Email Ingestion History */}
            {emailIngests && emailIngests.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Recent Email Ingestion Activity
                </Label>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {emailIngests.map((ingest) => (
                      <div 
                        key={ingest.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          {ingest.status === 'completed' ? (
                            <MailCheck className="w-5 h-5 text-green-600" />
                          ) : ingest.status === 'failed' ? (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                          )}
                          <div>
                            <p className="font-medium text-sm truncate max-w-[300px]">
                              {ingest.subject || 'No subject'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ingest.detectedPortal && (
                                <Badge variant="outline" className="mr-2">{ingest.detectedPortal}</Badge>
                              )}
                              {format(new Date(ingest.receivedAt), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {ingest.opportunitiesAboveThreshold} / {ingest.opportunitiesFound}
                          </p>
                          <p className="text-xs text-muted-foreground">above threshold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Uploaded Spreadsheets Management */}
            {batches && batches.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-medium flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Uploaded Spreadsheets
                </Label>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {batches.map((batch) => (
                      <div 
                        key={batch.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm truncate max-w-[250px]">
                              {batch.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {batch.processedOpportunities} opportunities • {format(new Date(batch.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={batch.status === 'completed' ? 'default' : batch.status === 'failed' ? 'destructive' : 'secondary'}>
                            {batch.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete "${batch.fileName}" and all ${batch.processedOpportunities} associated opportunities?`)) {
                                deleteBatchMutation.mutate(batch.id);
                              }
                            }}
                            disabled={deleteBatchMutation.isPending}
                            data-testid={`button-delete-batch-${batch.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Email Forwarding Instructions */}
            <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
              <Label className="text-sm font-medium">Email Forwarding Setup</Label>
              <p className="text-sm text-muted-foreground">
                To automatically ingest opportunities from government portals, configure an Outlook 
                rule to forward notifications from SAM.gov, DIBBS, GovWin, etc. to your designated 
                ingest address. Original emails remain in your inbox for compliance.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending || updateGlobalSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {(updateSettingsMutation.isPending || updateGlobalSettingsMutation.isPending) ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog - Admin/BD Admin Only */}
      {canViewAnalytics && (
        <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                IDIQ Portal Analytics
              </DialogTitle>
              <DialogDescription>
                User engagement metrics for the IDIQ Management Portal.
              </DialogDescription>
            </DialogHeader>
            
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : userAnalytics ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Users className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-xl font-bold">{userAnalytics.summary.usersOpenedOpps}</p>
                      <p className="text-xs text-muted-foreground">Users Viewed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Eye className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                      <p className="text-xl font-bold">{userAnalytics.summary.totalOpportunitiesOpened}</p>
                      <p className="text-xs text-muted-foreground">Opps Opened</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <Activity className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                      <p className="text-xl font-bold">{userAnalytics.summary.usersGaveFeedback}</p>
                      <p className="text-xs text-muted-foreground">Users Voted</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <ThumbsUp className="w-4 h-4 mx-auto mb-1 text-green-600" />
                      <p className="text-xl font-bold">{userAnalytics.summary.totalUpvotes}</p>
                      <p className="text-xs text-muted-foreground">Upvotes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <ThumbsDown className="w-4 h-4 mx-auto mb-1 text-red-600" />
                      <p className="text-xl font-bold">{userAnalytics.summary.totalDownvotes}</p>
                      <p className="text-xs text-muted-foreground">Downvotes</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <MessageSquare className="w-4 h-4 mx-auto mb-1 text-orange-600" />
                      <p className="text-xl font-bold">{userAnalytics.summary.totalFeedbackGiven}</p>
                      <p className="text-xs text-muted-foreground">Total Feedback</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <FileText className="w-4 h-4 mx-auto mb-1 text-teal-600" />
                      <p className="text-xl font-bold">{userAnalytics.summary.totalNotesCreated}</p>
                      <p className="text-xs text-muted-foreground">Notes Created</p>
                    </CardContent>
                  </Card>
                </div>

                {/* User Table */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">User Engagement</h3>
                  {userAnalytics.users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      No users have engaged with IDIQ opportunities yet.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium">User</th>
                              <th className="text-left p-3 font-medium">Role</th>
                              <th className="text-center p-3 font-medium">Opps Opened</th>
                              <th className="text-center p-3 font-medium">Feedback</th>
                              <th className="text-center p-3 font-medium">Notes</th>
                              <th className="text-left p-3 font-medium">Last Activity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userAnalytics.users.map((u) => (
                              <tr key={u.id} className="border-t hover:bg-muted/30">
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium">{u.firstName} {u.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{u.email}</p>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-xs">
                                    {u.role.replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td className="p-3 text-center">{u.opportunitiesOpened}</td>
                                <td className="p-3 text-center">{u.feedbackGiven}</td>
                                <td className="p-3 text-center">{u.notesCreated}</td>
                                <td className="p-3 text-muted-foreground">
                                  {u.lastActivity 
                                    ? new Date(u.lastActivity).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })
                                    : 'Never'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No analytics data available
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Opportunity Detail Dialog */}
      <Dialog open={!!selectedOpportunity} onOpenChange={() => setSelectedOpportunity(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOpportunity && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedOpportunity.contractVehicle && (
                      <Badge variant="secondary" className="font-semibold bg-primary/10 text-primary border-primary/20">
                        {selectedOpportunity.contractVehicle}
                      </Badge>
                    )}
                    {selectedOpportunity.opportunityType && (
                      <Badge variant="outline">
                        {selectedOpportunity.opportunityType}
                      </Badge>
                    )}
                    <Badge className={getScoreBadgeColor(selectedOpportunity.matchScore)}>
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {selectedOpportunity.matchScore ?? 0}% Match
                    </Badge>
                    {selectedOpportunity.aiCategory && (
                      <Badge variant="outline">{selectedOpportunity.aiCategory}</Badge>
                    )}
                    {selectedOpportunity.status === 'new' && (
                      <Badge variant="default" className="bg-primary">New</Badge>
                    )}
                  </div>
                  {/* Feedback Buttons */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>{feedbackCounts?.upvotes || 0}</span>
                      <Button
                        variant={userFeedback?.feedbackType === 'upvote' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => {
                          if (userFeedback?.feedbackType === 'upvote') {
                            deleteFeedbackMutation.mutate(selectedOpportunity.id);
                          } else {
                            openFeedbackDialog('upvote');
                          }
                        }}
                        data-testid="button-upvote"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Button
                        variant={userFeedback?.feedbackType === 'downvote' ? 'destructive' : 'ghost'}
                        size="icon"
                        onClick={() => {
                          if (userFeedback?.feedbackType === 'downvote') {
                            deleteFeedbackMutation.mutate(selectedOpportunity.id);
                          } else {
                            openFeedbackDialog('downvote');
                          }
                        }}
                        data-testid="button-downvote"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </Button>
                      <span>{feedbackCounts?.downvotes || 0}</span>
                    </div>
                  </div>
                </div>
                <DialogTitle className="text-xl mt-2">{selectedOpportunity.title}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Tags */}
                {selectedOpportunity.tags && selectedOpportunity.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedOpportunity.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}

                {/* Key Info */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedOpportunity.agency && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Agency:</span>
                      <span className="font-medium">{selectedOpportunity.agency}</span>
                    </div>
                  )}
                  {selectedOpportunity.dueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due:</span>
                      <span className="font-medium">
                        {format(new Date(selectedOpportunity.dueDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  {selectedOpportunity.estimatedValue && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Est. Value:</span>
                      <span className="font-medium">{selectedOpportunity.estimatedValue}</span>
                    </div>
                  )}
                  {selectedOpportunity.placeOfPerformance && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{selectedOpportunity.placeOfPerformance}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedOpportunity.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedOpportunity.description}
                    </p>
                  </div>
                )}

                {/* AI Analysis */}
                {selectedOpportunity.whyRelevant && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h4 className="font-medium text-primary">AI Analysis</h4>
                      <span className="text-xs text-muted-foreground italic ml-auto">Preliminary assessment — validation required</span>
                    </div>
                    <p className="text-sm mb-3">{selectedOpportunity.whyRelevant}</p>
                    <p className="text-xs text-muted-foreground italic mt-2 border-t border-primary/10 pt-2">
                      Based on available past performance and publicly supported programs.
                    </p>
                    
                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      {selectedOpportunity.discriminatorsStrengths && selectedOpportunity.discriminatorsStrengths.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-emerald-600 mb-1">Strengths</h5>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {selectedOpportunity.discriminatorsStrengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedOpportunity.discriminatorsWeaknesses && selectedOpportunity.discriminatorsWeaknesses.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-amber-600 mb-1">Challenges</h5>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {selectedOpportunity.discriminatorsWeaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Key Requirements */}
                {selectedOpportunity.requirements && selectedOpportunity.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Key Requirements</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {selectedOpportunity.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Capability Matches */}
                {selectedOpportunity.capabilityMatch && selectedOpportunity.capabilityMatch.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Matched Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedOpportunity.capabilityMatch.map((cap, i) => (
                        <Badge key={i} variant="outline">{cap}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Performance Match */}
                {selectedOpportunity.pastPerformanceMatch && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Past Performance Match:</span>
                    <Badge variant="outline">{selectedOpportunity.pastPerformanceMatch}</Badge>
                  </div>
                )}

                {/* Team Discussion Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Team Discussion
                    {comments && comments.length > 0 && (
                      <Badge variant="secondary" className="ml-1">{comments.length}</Badge>
                    )}
                  </h4>
                  
                  {/* Add Comment Form */}
                  <div className="flex gap-2 mb-4 relative">
                    <div className="flex-1 relative">
                      <Input
                        ref={commentInputRef}
                        placeholder="Add a comment... (Use @ to mention)"
                        value={newCommentText}
                        onChange={(e) => handleCommentInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCommentText.trim() && !showMentions) {
                            addCommentMutation.mutate({ 
                              id: selectedOpportunity.id, 
                              content: newCommentText,
                              mentions: selectedMentions
                            });
                          }
                          if (e.key === 'Escape') {
                            setShowMentions(false);
                          }
                        }}
                        data-testid="input-add-comment"
                      />
                      {/* Mention Suggestions Dropdown */}
                      {showMentions && mentionUsers && mentionUsers.length > 0 && (
                        <div className="absolute z-50 bottom-full mb-1 left-0 w-64 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {mentionUsers.map(user => (
                            <button
                              key={user.id}
                              className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                              onClick={() => handleMentionSelect(user)}
                              data-testid={`mention-suggestion-${user.id}`}
                            >
                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                {user.firstName?.[0] || user.email[0].toUpperCase()}{user.lastName?.[0] || ''}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{user.displayName}</div>
                                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      disabled={!newCommentText.trim() || addCommentMutation.isPending}
                      onClick={() => {
                        if (newCommentText.trim()) {
                          addCommentMutation.mutate({ 
                            id: selectedOpportunity.id, 
                            content: newCommentText,
                            mentions: selectedMentions
                          });
                        }
                      }}
                      data-testid="button-add-comment"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Comments List */}
                  {topLevelComments.length > 0 ? (
                    <div className="space-y-3">
                      {topLevelComments.map((comment) => {
                        const replies = getReplies(comment.id);
                        return (
                          <div key={comment.id} className="space-y-2">
                            {/* Main Comment */}
                            <div className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{comment.authorName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(comment.createdAt), "MMM d 'at' h:mm a")}
                                    </span>
                                  </div>
                                  <p className="text-sm">{comment.content}</p>
                                  
                                  {/* Comment Actions */}
                                  <div className="flex items-center gap-3 mt-2">
                                    <button
                                      className={`flex items-center gap-1 text-xs transition-colors ${
                                        comment.likedByMe 
                                          ? 'text-red-500' 
                                          : 'text-muted-foreground hover:text-red-500'
                                      }`}
                                      onClick={() => likeCommentMutation.mutate({ 
                                        commentId: comment.id, 
                                        liked: comment.likedByMe 
                                      })}
                                      data-testid={`button-like-comment-${comment.id}`}
                                    >
                                      <Heart className={`w-3.5 h-3.5 ${comment.likedByMe ? 'fill-current' : ''}`} />
                                      {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
                                    </button>
                                    <button
                                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                      onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                                      data-testid={`button-reply-comment-${comment.id}`}
                                    >
                                      <Reply className="w-3.5 h-3.5" />
                                      Reply
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Edit/Delete Menu (only for owner) */}
                                {comment.isOwner && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={() => {
                                          deleteCommentMutation.mutate({
                                            opportunityId: selectedOpportunity.id,
                                            commentId: comment.id,
                                          });
                                        }}
                                      >
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>

                            {/* Reply Input */}
                            {replyingToId === comment.id && (
                              <div className="flex gap-2 ml-6 relative">
                                <div className="flex-1 relative">
                                  <Input
                                    ref={replyInputRef}
                                    placeholder={`Reply to ${comment.authorName}... (Use @ to mention)`}
                                    value={replyText}
                                    onChange={(e) => handleReplyInputChange(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && replyText.trim() && !showReplyMentions) {
                                        addCommentMutation.mutate({ 
                                          id: selectedOpportunity.id, 
                                          content: replyText,
                                          parentId: comment.id,
                                          mentions: replySelectedMentions
                                        });
                                      }
                                      if (e.key === 'Escape') {
                                        if (showReplyMentions) {
                                          setShowReplyMentions(false);
                                        } else {
                                          setReplyingToId(null);
                                          setReplyText("");
                                        }
                                      }
                                    }}
                                    autoFocus
                                    data-testid={`input-reply-${comment.id}`}
                                  />
                                  {/* Reply Mention Suggestions */}
                                  {showReplyMentions && mentionUsers && mentionUsers.length > 0 && (
                                    <div className="absolute z-50 bottom-full mb-1 left-0 w-64 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                      {mentionUsers.map(user => (
                                        <button
                                          key={user.id}
                                          className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left"
                                          onClick={() => handleReplyMentionSelect(user)}
                                          data-testid={`reply-mention-suggestion-${user.id}`}
                                        >
                                          <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                            {user.firstName?.[0] || user.email[0].toUpperCase()}{user.lastName?.[0] || ''}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">{user.displayName}</div>
                                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  disabled={!replyText.trim() || addCommentMutation.isPending}
                                  onClick={() => {
                                    if (replyText.trim()) {
                                      addCommentMutation.mutate({ 
                                        id: selectedOpportunity.id, 
                                        content: replyText,
                                        parentId: comment.id,
                                        mentions: replySelectedMentions
                                      });
                                    }
                                  }}
                                  data-testid={`button-submit-reply-${comment.id}`}
                                >
                                  Reply
                                </Button>
                              </div>
                            )}

                            {/* Replies */}
                            {replies.length > 0 && (
                              <div className="ml-6 space-y-2">
                                {replies.map((reply) => (
                                  <div key={reply.id} className="bg-muted/30 rounded-lg p-3 border-l-2 border-primary/20">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <CornerDownRight className="w-3 h-3 text-muted-foreground" />
                                          <span className="font-medium text-sm">{reply.authorName}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {format(new Date(reply.createdAt), "MMM d 'at' h:mm a")}
                                          </span>
                                        </div>
                                        <p className="text-sm ml-5">{reply.content}</p>
                                        
                                        {/* Reply Actions */}
                                        <div className="flex items-center gap-3 mt-2 ml-5">
                                          <button
                                            className={`flex items-center gap-1 text-xs transition-colors ${
                                              reply.likedByMe 
                                                ? 'text-red-500' 
                                                : 'text-muted-foreground hover:text-red-500'
                                            }`}
                                            onClick={() => likeCommentMutation.mutate({ 
                                              commentId: reply.id, 
                                              liked: reply.likedByMe 
                                            })}
                                            data-testid={`button-like-reply-${reply.id}`}
                                          >
                                            <Heart className={`w-3.5 h-3.5 ${reply.likedByMe ? 'fill-current' : ''}`} />
                                            {reply.likeCount > 0 && <span>{reply.likeCount}</span>}
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Delete Menu (only for owner) */}
                                      {reply.isOwner && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                              <MoreVertical className="w-3 h-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem 
                                              className="text-destructive"
                                              onClick={() => {
                                                deleteCommentMutation.mutate({
                                                  opportunityId: selectedOpportunity.id,
                                                  commentId: reply.id,
                                                });
                                              }}
                                            >
                                              Delete
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet. Start the discussion!
                    </p>
                  )}
                </div>

                {/* User Notes Section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    My Notes
                  </h4>
                  
                  {/* Add Note Form */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Add a private note..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newNoteText.trim()) {
                          addNoteMutation.mutate({ id: selectedOpportunity.id, noteText: newNoteText });
                        }
                      }}
                      data-testid="input-add-note"
                    />
                    <Button
                      size="sm"
                      disabled={!newNoteText.trim() || addNoteMutation.isPending}
                      onClick={() => {
                        if (newNoteText.trim()) {
                          addNoteMutation.mutate({ id: selectedOpportunity.id, noteText: newNoteText });
                        }
                      }}
                      data-testid="button-add-note"
                    >
                      Add
                    </Button>
                  </div>

                  {/* Notes List */}
                  {userNotes && userNotes.length > 0 && (
                    <div className="space-y-2">
                      {userNotes.map((note) => (
                        <div key={note.id} className="bg-muted/50 rounded-lg p-3">
                          {editingNoteId === note.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                data-testid={`input-edit-note-${note.id}`}
                              />
                              <Button
                                size="sm"
                                disabled={!editingNoteText.trim() || updateNoteMutation.isPending}
                                onClick={() => {
                                  if (editingNoteText.trim()) {
                                    updateNoteMutation.mutate({
                                      opportunityId: selectedOpportunity.id,
                                      noteId: note.id,
                                      noteText: editingNoteText.trim(),
                                    });
                                  }
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteText("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm">{note.noteText}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {note.authorName} • {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditingNoteText(note.noteText);
                                  }}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => {
                                      deleteNoteMutation.mutate({
                                        opportunityId: selectedOpportunity.id,
                                        noteId: note.id,
                                      });
                                    }}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-6 gap-2">
                {selectedOpportunity.originalUrl && (
                  <Button variant="outline" asChild>
                    <a href={selectedOpportunity.originalUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Source
                    </a>
                  </Button>
                )}
                <Button
                  variant={selectedOpportunity.status === 'saved' ? "secondary" : "default"}
                  onClick={() => {
                    updateStatusMutation.mutate({ 
                      id: selectedOpportunity.id, 
                      status: selectedOpportunity.status === 'saved' ? 'reviewed' : 'saved' 
                    });
                    setSelectedOpportunity(null);
                  }}
                >
                  {selectedOpportunity.status === 'saved' ? (
                    <>
                      <Bookmark className="w-4 h-4 mr-2" />
                      Unsave
                    </>
                  ) : (
                    <>
                      <BookmarkCheck className="w-4 h-4 mr-2" />
                      Save for Action
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Reason Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {feedbackType === 'upvote' ? 'Why is this a good match?' : 'Why is this not a good match?'}
            </DialogTitle>
            <DialogDescription>
              Your feedback helps improve the AI scoring for future opportunities.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {feedbackType === 'upvote' ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackReason("Direct past performance")}>
                    Direct past performance
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackReason("Held contract vehicle")}>
                    Held contract vehicle
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackReason("Known customer")}>
                    Known customer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackReason("Core capability match")}>
                    Core capability match
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackReason("Outside our capabilities")}>
                    Outside capabilities
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackReason("Too small/large")}>
                    Wrong size
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackReason("Wrong location")}>
                    Wrong location
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFeedbackReason("Already pursuing")}>
                    Already pursuing
                  </Button>
                </>
              )}
            </div>
            <Input
              placeholder="Or type your own reason..."
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              data-testid="input-feedback-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowFeedbackDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitFeedback}
              disabled={submitFeedbackMutation.isPending}
              data-testid="button-submit-feedback"
            >
              {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stat Tile Component
function StatTile({ 
  icon, 
  value, 
  label, 
  isLoading,
  onClick,
  isActive = false
}: { 
  icon: React.ReactNode; 
  value: number; 
  label: string;
  isLoading: boolean;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <Card 
      className={`hover-elevate cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
        <div>
          {isLoading ? (
            <Skeleton className="h-7 w-12 mb-1" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Factory icon import
import { Factory } from "lucide-react";

// Opportunity Card Component
function OpportunityCard({
  opportunity,
  onView,
  onSave,
  onArchive,
  getScoreBadgeColor,
  getSourceIcon,
  getSourceLabel,
  isUnread,
}: {
  opportunity: IdiqOpportunity;
  onView: () => void;
  onSave: () => void;
  onArchive: () => void;
  getScoreBadgeColor: (score: number | null) => string;
  getSourceIcon: (source: string) => React.ReactNode;
  getSourceLabel: (source: string) => string;
  isUnread: boolean;
}) {
  return (
    <Card 
      className={`hover-elevate cursor-pointer transition-all ${isUnread ? 'border-l-4 border-l-primary' : ''}`}
      onClick={onView}
      data-testid={`card-opportunity-${opportunity.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Unread indicator dot */}
          {isUnread && (
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {/* Header with badges */}
            <div className="flex items-center flex-wrap gap-2 mb-2">
              {opportunity.contractVehicle && (
                <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                  {opportunity.contractVehicle}
                </Badge>
              )}
              {opportunity.opportunityType && (
                <Badge variant="outline" className="text-xs">
                  {opportunity.opportunityType}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {getSourceIcon(opportunity.sourceType)}
                <span className="ml-1">{getSourceLabel(opportunity.sourceType)}</span>
              </Badge>
              <Badge className={`${getScoreBadgeColor(opportunity.matchScore)}`}>
                <TrendingUp className="w-3 h-3 mr-1" />
                {opportunity.matchScore ?? 0}% Match
              </Badge>
              {isUnread && (
                <Badge variant="default" className="bg-primary text-xs">Unread</Badge>
              )}
              {opportunity.status === 'saved' && (
                <Badge variant="secondary">
                  <BookmarkCheck className="w-3 h-3 mr-1" />
                  Saved
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-lg mb-1 line-clamp-1">
              {opportunity.title}
            </h3>

            {/* Description */}
            {opportunity.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {opportunity.description}
              </p>
            )}

            {/* Meta info row */}
            <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground">
              {opportunity.agency && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {opportunity.agency}
                </span>
              )}
              {opportunity.postedDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(opportunity.postedDate), "MMM d, yyyy")}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {opportunity.viewCount} views
              </span>
            </div>

            {/* Why Relevant */}
            {opportunity.relevancySummary && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Why relevant: </span>
                    {opportunity.relevancySummary}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSave}
              title={opportunity.status === 'saved' ? 'Unsave' : 'Save for action'}
              data-testid={`button-save-${opportunity.id}`}
            >
              {opportunity.status === 'saved' ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-more-${opportunity.id}`}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Mark as Relevant
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Mark as Not Relevant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
