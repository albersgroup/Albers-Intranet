import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Lock, CheckCircle2 } from "lucide-react";
import albersLogo from "@assets/Logo_Header_1765410705707.png";
import bgImage from "@assets/10823_1765410591190.jpg";

const resetPasswordFormSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL query params
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    
    if (!tokenParam) {
      toast({
        title: "Invalid Link",
        description: "This password reset link is invalid or has expired.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/login"), 2000);
    } else {
      setToken(tokenParam);
    }
  }, [toast, setLocation]);

  const form = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormInput) => {
    if (!token) {
      toast({
        title: "Error",
        description: "Reset token is missing",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }

      setResetSuccess(true);
      toast({
        title: "Password Reset Successfully",
        description: "Your password has been reset. You can now log in with your new password.",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-black/60" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <img 
              src={albersLogo} 
              alt="Albers Aerospace" 
              className="h-12 mb-8"
            />
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold leading-tight">
                American Made.
                <br />
                Warfighter Ready.
              </h1>
              <p className="text-lg text-white/90 max-w-md">
                Business Operations Unit Portal
              </p>
            </div>
            
            <div className="space-y-4 pt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 flex-shrink-0 mt-0.5 text-primary" />
                <div>
                  <h3 className="font-semibold mb-1">Secure Access</h3>
                  <p className="text-sm text-white/80">
                    Enterprise-grade authentication for authorized personnel
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Lock className="w-6 h-6 flex-shrink-0 mt-0.5 text-primary" />
                <div>
                  <h3 className="font-semibold mb-1">Protected Resources</h3>
                  <p className="text-sm text-white/80">
                    SOPs, BD tools, templates, proposal training, and AI-powered assistance
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-white/60">
            © 2025 Albers Aerospace. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Side - Reset Password Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Create New Password</CardTitle>
              <CardDescription>
                Enter your new password below. Make sure it's at least 8 characters long.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetSuccess ? (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                    <div>
                      <p className="font-semibold text-foreground mb-1">Password Reset Successfully</p>
                      <p className="text-sm text-muted-foreground">
                        Redirecting you to the login page...
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full"
                    data-testid="button-go-to-login"
                    data-goatcounter-click="auth-reset-password-go-to-login"
                    data-goatcounter-title="Navigate to login after successful password reset"
                  >
                    Go to Login
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Enter new password"
                              disabled={isLoading}
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              placeholder="Confirm new password"
                              disabled={isLoading}
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                      data-testid="button-reset-password"
                      data-goatcounter-click="auth-reset-password-submit"
                      data-goatcounter-title="Submit new password for account reset"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resetting password...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              <div className="mt-6 text-center text-xs text-muted-foreground">
                For assistance, contact the Business Operations Unit
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
