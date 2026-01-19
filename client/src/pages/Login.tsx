import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import albersLogo from "@assets/Logo_Header_1765410705707.png";
import heroImg from "@assets/stock_images/military_fighter_jet_e81d120d.jpg";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.emailResent) {
          toast({
            title: "Verification Email Sent",
            description: error.message || "We've sent a new verification code to your inbox.",
          });
          setIsLoading(false);
          return;
        }
        throw new Error(error.message || "Login failed");
      }

      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });

      toast({
        title: "Success!",
        description: "You have been logged in successfully.",
      });

      setTimeout(() => {
        setLocation("/");
      }, 50);
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Full-screen Image Background */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImg})` }}
      />

      {/* Dark Overlay - only on left side for readability */}
      <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 bg-gradient-to-r from-black/80 via-black/70 to-transparent" />

      {/* Content Overlay - positioned on left side */}
      <div className="relative z-10 min-h-screen flex flex-col items-center lg:items-start justify-center p-6 lg:p-12 lg:w-1/2">
        {/* Logo and Tagline */}
        <div className="text-center lg:text-left mb-8 w-full max-w-md">
          <img 
            src={albersLogo} 
            alt="Albers Aerospace" 
            className="h-16 mx-auto lg:mx-0 mb-4"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            American Made.
          </h1>
          <p className="text-xl md:text-2xl text-primary font-semibold">
            Warfighter Ready.
          </p>
        </div>

        {/* Login Card */}
        <Card className="w-full max-w-md shadow-2xl bg-card/95 backdrop-blur-sm" data-testid="card-login">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center" data-testid="text-login-title">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center" data-testid="text-login-description">
              Sign in to access the Albers Aerospace Intranet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="you@company.com" 
                          {...field} 
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          data-testid="input-password"
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
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center space-y-2">
              <button
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
                onClick={() => setLocation("/forgot-password")}
                data-testid="link-forgot-password"
              >
                Forgot your password?
              </button>
              <div className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button 
                  className="font-semibold text-primary hover:underline"
                  onClick={() => setLocation("/register")}
                  data-testid="link-register"
                >
                  Register here
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mission Statement */}
        <div className="mt-8 text-center lg:text-left w-full max-w-md">
          <p className="text-white/80 text-sm leading-relaxed">
            Albers Aerospace delivers mission-critical solutions for defense 
            and industrial clients worldwide. Our commitment to excellence 
            drives everything we do.
          </p>
        </div>
      </div>
    </div>
  );
}
