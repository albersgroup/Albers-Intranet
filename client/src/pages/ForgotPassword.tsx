import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Lock, ArrowLeft } from "lucide-react";
import albersLogo from "@assets/Logo_Header_1765410705707.png";
import bgImage from "@assets/35705_1765410595094.jpg";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reset email");
      }

      setEmailSent(true);
      toast({
        title: "Check Your Email",
        description: "If an account exists, a password reset link has been sent.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Right Side - Forgot Password Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/login")}
                  className="gap-2"
                  data-testid="button-back-to-login"
                  data-goatcounter-click="auth-forgot-password-back"
                  data-goatcounter-title="Navigate back to login from forgot password"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to login
                </Button>
              </div>
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailSent ? (
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                    <p className="text-sm text-foreground">
                      If an account with that email exists, we've sent a password reset link. 
                      Please check your inbox and spam folder.
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocation("/login")}
                    className="w-full"
                    data-testid="button-return-to-login"
                    data-goatcounter-click="auth-forgot-password-return"
                    data-goatcounter-title="Return to login after password reset email sent"
                  >
                    Return to Login
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="your.name@albers.aero"
                              disabled={isLoading}
                              data-testid="input-email"
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
                      data-testid="button-send-reset-link"
                      data-goatcounter-click="auth-forgot-password-submit"
                      data-goatcounter-title="Submit email for password reset link"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                      Remember your password?{" "}
                      <button
                        type="button"
                        onClick={() => setLocation("/login")}
                        className="text-primary hover:underline"
                        data-testid="link-login"
                      >
                        Sign in
                      </button>
                    </div>
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
