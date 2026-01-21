import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyEmailSchema, type VerifyEmailInput } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Mail, Shield } from "lucide-react";
import albersLogo from "@assets/Logo_Header_1765410705707.png";
import bgImage from "@assets/40340_1765410597164.jpg";

export default function VerifyEmail() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");

  // Extract email from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // No email provided, redirect to register
      setLocation("/register");
    }
  }, [setLocation]);

  const form = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: email,
      code: "",
    },
  });

  // Update form email when email state changes
  useEffect(() => {
    if (email) {
      form.setValue("email", email);
    }
  }, [email, form]);

  const onSubmit = async (data: VerifyEmailInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verification failed");
      }

      const result = await response.json();

      // Update auth cache
      queryClient.setQueryData(["/api/auth/me"], result.user);

      toast({
        title: "Email Verified!",
        description: "Your account is now active. Welcome to the Business Operations Unit Portal!",
      });

      // Small delay to ensure auth state is updated before redirect
      setTimeout(() => {
        setLocation("/");
      }, 100);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired verification code",
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
                Almost There!
                <br />
                Verify Your Email
              </h1>
              <p className="text-lg text-white/90 max-w-md">
                We've sent a 6-digit verification code to your email address
              </p>
            </div>
            
            <div className="space-y-4 pt-6">
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 flex-shrink-0 mt-0.5 text-primary" />
                <div>
                  <h3 className="font-semibold mb-1">Check Your Inbox</h3>
                  <p className="text-sm text-white/80">
                    Look for an email with your verification code
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 flex-shrink-0 mt-0.5 text-primary" />
                <div>
                  <h3 className="font-semibold mb-1">Secure Access</h3>
                  <p className="text-sm text-white/80">
                    Email verification ensures only authorized Albers personnel can access the portal
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

      {/* Right Side - Verification Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <img 
              src={albersLogo} 
              alt="Albers Aerospace" 
              className="h-10 mx-auto mb-4"
            />
            <p className="text-sm text-muted-foreground">
              Business Operations Unit Portal
            </p>
          </div>

          <Card className="border-card-border">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="123456"
                            maxLength={6}
                            data-testid="input-verification-code"
                            disabled={isLoading}
                            className="text-center text-2xl tracking-widest font-mono"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Code expires in 15 minutes
                        </p>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                    data-testid="button-verify"
                    data-goatcounter-click="auth-verify-email-submit"
                    data-goatcounter-title="Email verification code submission"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Email"
                    )}
                  </Button>
                </form>
              </Form>
              <div className="mt-6 text-center text-sm space-y-2">
                <p className="text-muted-foreground">
                  Didn't receive the code?
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your spam folder or contact support
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <button
              className="text-primary hover:underline font-medium"
              onClick={() => setLocation("/login")}
              data-testid="link-back-to-login"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
