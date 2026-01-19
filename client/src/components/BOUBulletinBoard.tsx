import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  MoreHorizontal,
  Trash2,
  Users,
  AtSign,
  Star,
  Loader2,
  ChevronDown,
  ChevronUp,
  Image,
  Video,
  FileText,
  Link2,
  X,
  ExternalLink,
  Upload,
  AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BOUMember {
  id: string;
  user_id: string;
  display_name: string;
  member_tag: string;
  is_lead: boolean;
  first_name: string;
  last_name: string;
  email: string;
}

interface BOUPost {
  id: string;
  author_id: string;
  content: string;
  post_type: 'text' | 'image' | 'video' | 'document' | 'link';
  media_url?: string;
  media_name?: string;
  media_mime_type?: string;
  link_url?: string;
  link_title?: string;
  link_description?: string;
  link_image?: string;
  attachment_url?: string;
  attachment_name?: string;
  created_at: string;
  updated_at: string;
  author_first_name: string;
  author_last_name: string;
  author_email: string;
  author_display_name?: string;
  author_tag?: string;
  author_is_lead?: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  user_liked: boolean;
  user_shared: boolean;
}

interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
}

type PostType = 'text' | 'image' | 'video' | 'document' | 'link';

interface BOUComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_first_name: string;
  author_last_name: string;
  author_email: string;
  author_display_name?: string;
  author_tag?: string;
  author_is_lead?: boolean;
  like_count: number;
  user_liked: boolean;
}

interface MembershipResponse {
  isMember: boolean;
  member: BOUMember | null;
}

function MentionSuggestions({ 
  query, 
  members, 
  onSelect,
  visible
}: { 
  query: string; 
  members: BOUMember[]; 
  onSelect: (tag: string) => void;
  visible: boolean;
}) {
  if (!visible || !query) return null;
  
  const filtered = members.filter(m => 
    m.member_tag.toLowerCase().includes(query.toLowerCase()) ||
    m.display_name.toLowerCase().includes(query.toLowerCase())
  );
  
  // Check if "@BOU Team" should show
  const showBouTeam = 'bou.team'.includes(query.toLowerCase()) || 
                      'bou team'.includes(query.toLowerCase()) ||
                      'team'.includes(query.toLowerCase());
  
  if (filtered.length === 0 && !showBouTeam) return null;
  
  return (
    <div className="absolute z-50 bottom-full mb-1 left-0 w-64 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto">
      {/* BOU Team option - notifies all members */}
      {showBouTeam && (
        <button
          className="w-full flex items-center gap-2 p-2 hover-elevate text-left border-b"
          onClick={() => onSelect('bou.team')}
          data-testid="mention-suggestion-bou-team"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              BT
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">BOU Team</div>
            <div className="text-xs text-muted-foreground">@bou.team · Notify all members</div>
          </div>
          <Users className="h-4 w-4 text-primary" />
        </button>
      )}
      {filtered.map(member => (
        <button
          key={member.id}
          className="w-full flex items-center gap-2 p-2 hover-elevate text-left"
          onClick={() => onSelect(member.member_tag)}
          data-testid={`mention-suggestion-${member.member_tag}`}
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {member.first_name[0]}{member.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{member.display_name}</div>
            <div className="text-xs text-muted-foreground">@{member.member_tag}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

interface PostData {
  content: string;
  postType: PostType;
  mediaUrl?: string;
  mediaName?: string;
  mediaMimeType?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
}

function PostComposer({ 
  members, 
  onPost 
}: { 
  members: BOUMember[]; 
  onPost: (data: PostData) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>('text');
  const [isPosting, setIsPosting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Clean up object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (mediaPreview && mediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);
  
  const handleContentChange = (value: string) => {
    setContent(value);
    
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z.]*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };
  
  const handleMentionSelect = (tag: string) => {
    const cursorPos = textareaRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);
    const newTextBefore = textBeforeCursor.replace(/@[a-zA-Z.]*$/, `@${tag} `);
    
    setContent(newTextBefore + textAfterCursor);
    setShowMentions(false);
    setMentionQuery("");
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine post type from file
    if (file.type.startsWith('image/')) {
      setPostType('image');
    } else if (file.type.startsWith('video/')) {
      setPostType('video');
    } else {
      setPostType('document');
    }

    setMediaFile(file);
    
    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setMediaPreview(URL.createObjectURL(file));
    } else {
      setMediaPreview("");
    }
  };

  const clearMedia = () => {
    // Revoke object URL to prevent memory leaks
    if (mediaPreview && mediaPreview.startsWith('blob:')) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview("");
    setPostType('text');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const fetchLinkPreview = async () => {
    if (!linkUrl.trim()) return;
    
    try {
      setIsFetchingPreview(true);
      const res = await fetch('/api/bou/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: linkUrl })
      });
      
      if (res.ok) {
        const preview = await res.json();
        setLinkPreview(preview);
        setPostType('link');
      } else {
        toast({ title: "Could not fetch link preview", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error fetching link preview", variant: "destructive" });
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const clearLink = () => {
    setLinkUrl("");
    setLinkPreview(null);
    if (postType === 'link') {
      setPostType('text');
    }
  };
  
  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    
    try {
      let uploadedMedia: { url: string; name: string; mimeType: string } | null = null;
      
      // Upload media if present
      if (mediaFile && (postType === 'image' || postType === 'video' || postType === 'document')) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', mediaFile);
        
        const uploadRes = await fetch('/api/bou/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        
        if (!uploadRes.ok) {
          throw new Error('Failed to upload media');
        }
        
        uploadedMedia = await uploadRes.json();
        setIsUploading(false);
      }

      const postData: PostData = {
        content: content.trim(),
        postType,
      };

      if (uploadedMedia) {
        postData.mediaUrl = uploadedMedia.url;
        postData.mediaName = uploadedMedia.name;
        postData.mediaMimeType = uploadedMedia.mimeType;
      }

      if (postType === 'link' && linkPreview) {
        postData.linkUrl = linkPreview.url;
        postData.linkTitle = linkPreview.title;
        postData.linkDescription = linkPreview.description;
        postData.linkImage = linkPreview.image;
      }

      await onPost(postData);
      
      // Reset form
      setContent("");
      setPostType('text');
      clearMedia();
      clearLink();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsPosting(false);
      setIsUploading(false);
    }
  };
  
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Share an update with the BOU team... Use @first.last to mention someone"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="min-h-[80px] resize-none"
              data-testid="input-post-content"
            />
            <MentionSuggestions
              query={mentionQuery}
              members={members}
              onSelect={handleMentionSelect}
              visible={showMentions}
            />

            {/* Media Preview */}
            {mediaFile && (
              <div className="mt-2 relative rounded-md overflow-hidden border">
                {postType === 'image' && mediaPreview && (
                  <img src={mediaPreview} alt="Preview" className="max-h-48 w-auto mx-auto" />
                )}
                {postType === 'video' && mediaPreview && (
                  <video src={mediaPreview} controls className="max-h-48 w-full" />
                )}
                {postType === 'document' && (
                  <div className="p-3 flex items-center gap-2 bg-muted">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mediaFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={clearMedia}
                  data-testid="button-clear-media"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Link Preview */}
            {linkPreview && (
              <div className="mt-2 relative rounded-md overflow-hidden border">
                <div className="flex">
                  {linkPreview.image && (
                    <div className="w-24 h-24 flex-shrink-0">
                      <img 
                        src={linkPreview.image} 
                        alt="" 
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                  <div className="flex-1 p-3 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{linkPreview.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {linkPreview.description}
                    </p>
                    <p className="text-xs text-primary mt-1 truncate">{linkPreview.url}</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={clearLink}
                  data-testid="button-clear-link"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Link Input */}
            {!mediaFile && !linkPreview && postType === 'link' && (
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Paste a URL..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchLinkPreview()}
                  data-testid="input-link-url"
                />
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={fetchLinkPreview}
                  disabled={!linkUrl.trim() || isFetchingPreview}
                >
                  {isFetchingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview"}
                </Button>
              </div>
            )}

            {/* CUI Warning for uploads */}
            {(postType === 'image' || postType === 'video' || postType === 'document') && !mediaFile && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Do not upload Controlled Unclassified Information (CUI) or classified materials.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button
                  size="icon"
                  variant={postType === 'image' ? 'default' : 'ghost'}
                  className="h-8 w-8"
                  onClick={() => {
                    clearLink();
                    if (postType === 'image') {
                      clearMedia();
                    } else {
                      setPostType('image');
                      fileInputRef.current?.click();
                    }
                  }}
                  title="Add Image"
                  data-testid="button-add-image"
                >
                  <Image className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={postType === 'video' ? 'default' : 'ghost'}
                  className="h-8 w-8"
                  onClick={() => {
                    clearLink();
                    if (postType === 'video') {
                      clearMedia();
                    } else {
                      setPostType('video');
                      fileInputRef.current?.click();
                    }
                  }}
                  title="Add Video"
                  data-testid="button-add-video"
                >
                  <Video className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={postType === 'document' ? 'default' : 'ghost'}
                  className="h-8 w-8"
                  onClick={() => {
                    clearLink();
                    if (postType === 'document') {
                      clearMedia();
                    } else {
                      setPostType('document');
                      fileInputRef.current?.click();
                    }
                  }}
                  title="Add Document"
                  data-testid="button-add-document"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={postType === 'link' ? 'default' : 'ghost'}
                  className="h-8 w-8"
                  onClick={() => {
                    clearMedia();
                    if (postType === 'link') {
                      clearLink();
                      setPostType('text');
                    } else {
                      setPostType('link');
                    }
                  }}
                  title="Add Link"
                  data-testid="button-add-link"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                <div className="h-4 w-px bg-border mx-1" />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AtSign className="h-3 w-3" />
                  <span className="hidden sm:inline">@ to mention</span>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={handleSubmit}
                disabled={!content.trim() || isPosting || isUploading}
                data-testid="button-submit-post"
              >
                {isPosting || isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onLike,
  onDelete,
  isMember
}: {
  comment: BOUComment;
  currentUserId?: string;
  onLike: () => void;
  onDelete: () => void;
  isMember: boolean;
}) {
  const renderContentWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z]+\.[a-zA-Z]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} className="text-primary font-medium">{part}</span>;
      }
      return part;
    });
  };

  const isAuthor = currentUserId === comment.author_id;

  return (
    <div className="flex gap-2 py-2">
      <Avatar className="h-7 w-7 flex-shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {comment.author_first_name[0]}{comment.author_last_name[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="bg-background border rounded-lg p-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-medium">
              {comment.author_display_name || `${comment.author_first_name} ${comment.author_last_name}`}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">
            {renderContentWithMentions(comment.content)}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <button
            onClick={onLike}
            disabled={!isMember}
            className={`text-xs flex items-center gap-1 ${
              comment.user_liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            data-testid={`button-like-comment-${comment.id}`}
          >
            <Heart className={`h-3 w-3 ${comment.user_liked ? "fill-current" : ""}`} />
            {Number(comment.like_count) > 0 && comment.like_count}
          </button>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {isAuthor && (
            <button
              onClick={onDelete}
              className="text-xs text-muted-foreground hover:text-destructive"
              data-testid={`button-delete-comment-${comment.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentThread({
  postId,
  members,
  isMember,
  currentUserId
}: {
  postId: string;
  members: BOUMember[];
  isMember: boolean;
  currentUserId?: string;
}) {
  const [newComment, setNewComment] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<BOUComment[]>({
    queryKey: ['/api/bou/posts', postId, 'comments'],
    queryFn: async () => {
      const res = await fetch(`/api/bou/posts/${postId}/comments`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch comments');
      return res.json();
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', `/api/bou/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bou/posts', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bou/posts'] });
      setNewComment("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    }
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiRequest('POST', `/api/bou/comments/${commentId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bou/posts', postId, 'comments'] });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return apiRequest('DELETE', `/api/bou/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bou/posts', postId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bou/posts'] });
      toast({ title: "Comment deleted" });
    }
  });

  const handleInputChange = (value: string) => {
    setNewComment(value);
    const mentionMatch = value.match(/@([a-zA-Z.]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = (tag: string) => {
    const newText = newComment.replace(/@[a-zA-Z.]*$/, `@${tag} `);
    setNewComment(newText);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  return (
    <div className="border-t pt-3">
      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onLike={() => likeCommentMutation.mutate(comment.id)}
              onDelete={() => deleteCommentMutation.mutate(comment.id)}
              isMember={isMember}
            />
          ))}
        </div>
      )}
      
      {isMember && (
        <div className="flex gap-2 mt-3 relative">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              <Users className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Write a comment..."
              className="w-full px-3 py-1.5 text-sm rounded-full bg-background border focus:ring-1 focus:ring-primary outline-none"
              disabled={addCommentMutation.isPending}
              data-testid={`input-comment-${postId}`}
            />
            <MentionSuggestions
              query={mentionQuery}
              members={members}
              onSelect={handleMentionSelect}
              visible={showMentions}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            data-testid={`button-submit-comment-${postId}`}
          >
            {addCommentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  members,
  isMember,
  currentUserId,
  onLike,
  onShare,
  onDelete
}: {
  post: BOUPost;
  members: BOUMember[];
  isMember: boolean;
  currentUserId?: string;
  onLike: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const isAuthor = currentUserId === post.author_id;

  const renderContentWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z]+\.[a-zA-Z]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} className="text-primary font-medium">{part}</span>;
      }
      return part;
    });
  };

  return (
    <Card className="mb-4" data-testid={`post-card-${post.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">
              {post.author_first_name[0]}{post.author_last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">
                  {post.author_display_name || `${post.author_first_name} ${post.author_last_name}`}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <p className="mt-2 whitespace-pre-wrap break-words">
              {renderContentWithMentions(post.content)}
            </p>
            
            {/* Image Post */}
            {post.post_type === 'image' && post.media_url && (
              <div className="mt-3 rounded-md overflow-hidden border">
                <img 
                  src={post.media_url} 
                  alt={post.media_name || "Image"} 
                  className="max-h-96 w-auto mx-auto"
                  loading="lazy"
                />
              </div>
            )}

            {/* Video Post */}
            {post.post_type === 'video' && post.media_url && (
              <div className="mt-3 rounded-md overflow-hidden border">
                <video 
                  src={post.media_url} 
                  controls 
                  className="max-h-96 w-full"
                  preload="metadata"
                />
              </div>
            )}

            {/* Document Post */}
            {post.post_type === 'document' && post.media_url && (
              <a 
                href={post.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-3 p-3 bg-muted rounded-md hover-elevate"
              >
                <FileText className="h-10 w-10 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{post.media_name || "Document"}</p>
                  <p className="text-xs text-muted-foreground">Click to download</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </a>
            )}

            {/* Link Post with Preview */}
            {post.post_type === 'link' && post.link_url && (
              <a 
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block rounded-md overflow-hidden border hover-elevate"
              >
                <div className="flex">
                  {post.link_image && (
                    <div className="w-32 h-24 flex-shrink-0 bg-muted">
                      <img 
                        src={post.link_image} 
                        alt="" 
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                  <div className="flex-1 p-3 min-w-0">
                    <p className="font-medium line-clamp-1">{post.link_title || post.link_url}</p>
                    {post.link_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {post.link_description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                      <Link2 className="h-3 w-3" />
                      <span className="truncate">{new URL(post.link_url).hostname}</span>
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* Legacy attachment support */}
            {post.attachment_url && !post.media_url && !post.link_url && (
              <a 
                href={post.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Share2 className="h-4 w-4" />
                {post.attachment_name || "Attachment"}
              </a>
            )}
            
            <Separator className="my-3" />
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLike}
                disabled={!isMember}
                className={post.user_liked ? "text-red-500 hover:text-red-600" : ""}
                data-testid={`button-like-post-${post.id}`}
              >
                <Heart className={`h-4 w-4 mr-1 ${post.user_liked ? "fill-current" : ""}`} />
                {Number(post.like_count) > 0 && <span>{post.like_count}</span>}
                <span className="ml-1 hidden sm:inline">Like</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                data-testid={`button-toggle-comments-${post.id}`}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                {Number(post.comment_count) > 0 && <span>{post.comment_count}</span>}
                <span className="ml-1 hidden sm:inline">Comment</span>
                {showComments ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
                disabled={!isMember}
                className={post.user_shared ? "text-primary" : ""}
                data-testid={`button-share-post-${post.id}`}
              >
                <Share2 className="h-4 w-4 mr-1" />
                {Number(post.share_count) > 0 && <span>{post.share_count}</span>}
                <span className="ml-1 hidden sm:inline">Share</span>
              </Button>
            </div>
            
            {showComments && (
              <CommentThread
                postId={post.id}
                members={members}
                isMember={isMember}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BOUBulletinBoard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: membership, isLoading: membershipLoading } = useQuery<MembershipResponse>({
    queryKey: ['/api/bou/membership']
  });

  const { data: members = [] } = useQuery<BOUMember[]>({
    queryKey: ['/api/bou/members']
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery<BOUPost[]>({
    queryKey: ['/api/bou/posts']
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: PostData) => {
      return apiRequest('POST', '/api/bou/posts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bou/posts'] });
      toast({ title: "Post created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create post", 
        variant: "destructive" 
      });
    }
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest('POST', `/api/bou/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bou/posts'] });
    }
  });

  const sharePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest('POST', `/api/bou/posts/${postId}/share`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bou/posts'] });
      toast({ title: "Post shared" });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return apiRequest('DELETE', `/api/bou/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bou/posts'] });
      toast({ title: "Post deleted" });
    }
  });

  const isMember = membership?.isMember ?? false;
  const currentUserId = membership?.member?.user_id;

  if (membershipLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">BOU Bulletin Board</CardTitle>
            </div>
            <Badge variant={isMember ? "default" : "secondary"}>
              {isMember ? "BOU Member" : "View Only"}
            </Badge>
          </div>
          {!isMember && (
            <p className="text-sm text-muted-foreground mt-2">
              Only BOU team members can post, comment, and interact with the bulletin board.
            </p>
          )}
        </CardHeader>
      </Card>

      {isMember && (
        <PostComposer 
          members={members} 
          onPost={async (data) => {
            await createPostMutation.mutateAsync(data);
          }}
        />
      )}

      {postsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No posts yet</h3>
            <p className="text-sm text-muted-foreground">
              {isMember ? "Be the first to share something with the team!" : "Check back later for updates from the BOU team."}
            </p>
          </CardContent>
        </Card>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            members={members}
            isMember={isMember}
            currentUserId={currentUserId}
            onLike={() => likePostMutation.mutate(post.id)}
            onShare={() => sharePostMutation.mutate(post.id)}
            onDelete={() => deletePostMutation.mutate(post.id)}
          />
        ))
      )}
    </div>
  );
}
