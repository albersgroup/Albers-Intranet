import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import logo from "@assets/Logo_Header_1765410705707.png";
import heroImage from "@assets/10823_1765410591190.jpg";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#51142a]/85 via-[#51142a]/75 to-[#0E2841]/70" />
      
      <div className="relative z-10 w-full max-w-2xl text-center p-4">
        {/* Albers Logo */}
        <div className="mb-6 sm:mb-8 flex justify-center">
          <img src={logo} alt="Albers Aerospace" className="h-12 sm:h-16" />
        </div>

        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-12 px-4 sm:px-6">
            {/* Error Icon */}
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-destructive" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-3">404 - Page Not Found</h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto px-2">
              The page you're looking for doesn't exist or has been moved.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="gap-2 w-full sm:min-w-[160px] sm:w-auto"
                data-testid="button-go-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
              <Button
                onClick={() => setLocation("/")}
                className="gap-2 w-full sm:min-w-[160px] sm:w-auto"
                data-testid="button-home"
              >
                <Home className="w-4 h-4" />
                Return Home
              </Button>
            </div>

            {/* Help Text */}
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-border">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Need help? Contact the Business Operations Unit
              </p>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1 break-words">
                Sr. BOU Manager: Greg James (gjames@albers.aero)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
