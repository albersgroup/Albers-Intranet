import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, Users, DollarSign, ExternalLink, Shield, Zap, Database } from "lucide-react";

export default function BusinessIntelligenceTool() {
  const handleLaunchBI = () => {
    window.open("/api/easy-bi-reports", "_blank");
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 sm:pb-32">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-2 sm:space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 mb-2">
            <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold px-4">Business Intelligence & Analytics</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Access comprehensive analytics, reports, and insights for business development activities via seamless single sign-on
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-xl font-bold">Analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capture</p>
                  <p className="text-xl font-bold">Tracking</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline</p>
                  <p className="text-xl font-bold">Health</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                  <Database className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Live</p>
                  <p className="text-xl font-bold">Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main CTA Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="text-center pb-3 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">Launch BI Reports Dashboard</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Click below to access the full Business Intelligence application with comprehensive analytics and reporting
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-6 sm:pb-8 px-4 sm:px-6">
            <Button
              size="lg"
              onClick={handleLaunchBI}
              className="gap-2 w-full sm:min-w-[200px] sm:w-auto"
              data-testid="button-launch-bi"
            >
              Open BI Dashboard
              <ExternalLink className="w-4 h-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Opens in a new tab with automatic single sign-on
            </p>
          </CardContent>
        </Card>

        {/* Features List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Opportunity Pipeline Tracking</p>
                    <p className="text-sm text-muted-foreground">Monitor all opportunities from discovery through award</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Win Rate Analysis</p>
                    <p className="text-sm text-muted-foreground">Analyze historical performance and trends</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Capture Performance Metrics</p>
                    <p className="text-sm text-muted-foreground">Track capture manager effectiveness and outcomes</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Revenue Forecasting</p>
                    <p className="text-sm text-muted-foreground">Project future revenue based on pipeline data</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Custom Dashboard Views</p>
                    <p className="text-sm text-muted-foreground">Personalize your analytics experience</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Export & Reporting</p>
                    <p className="text-sm text-muted-foreground">Generate reports for leadership presentations</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Note */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Shield className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium mb-1">Secure Single Sign-On</p>
                <p className="text-sm text-muted-foreground">
                  Your session is automatically authenticated using secure SSO. No need to log in again.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
