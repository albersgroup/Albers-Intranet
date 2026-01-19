import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factory, FileText, ArrowRight, Building2 } from "lucide-react";
import { Link } from "wouter";
import LatestNews from "@/components/LatestNews";
import NewsletterPreview from "@/components/NewsletterPreview";
import DivisionBulletins from "@/components/DivisionBulletins";
import InlineSearch from "@/components/InlineSearch";
import heroIndustrialsImg from "@assets/stock_images/industrial_manufactu_b693a86f.jpg";

export default function IndustrialsHome() {
  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto space-y-6">
      {/* Hero Section - Premium Design with Industrials Image */}
      <div className="relative overflow-hidden rounded-lg shadow-lg">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroIndustrialsImg})` }}
        />
        {/* Dark Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#78350f]/90 via-[#451a03]/85 to-[#51142a]/80" />
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse" />
        <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/15 rounded-full animate-pulse delay-300" />
        <div className="absolute bottom-1/3 right-1/2 w-1 h-1 bg-white/10 rounded-full animate-pulse delay-700" />
        
        {/* Content container with padding */}
        <div className="relative z-10 p-8">
          {/* Header with Icon Badge */}
          <div className="flex items-start gap-5 mb-6">
            <div className="relative">
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                <Factory className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-[#78350f] animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/20 text-white border-white/30 text-xs font-medium">
                  Industrial Division
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Albers Industrials
              </h1>
              <p className="text-lg text-white/80">
                Industrial Division Portal
              </p>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-white/70 mb-6 leading-relaxed">
            Welcome to the Albers Industrials division hub. Access industrial-specific resources, 
            news, and tools for our industrial operations and manufacturing programs.
          </p>
          
          {/* Search Bar with Enhanced Styling */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
            <InlineSearch />
          </div>
          
          {/* Quick Stats Row */}
          <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full" />
              <span className="text-white/60 text-sm">Manufacturing Operations</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm">Industrial Programs</span>
            </div>
            <Link href="/">
              <div className="flex items-center gap-2 hover:text-white/80 cursor-pointer">
                <ArrowRight className="w-4 h-4 text-white/60" />
                <span className="text-white/60 text-sm">Go to Corporate Portal</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Bulletins */}
      <DivisionBulletins division="industrials" limit={5} title="Industrials Bulletins" />

      {/* News */}
      <LatestNews division="industrials" limit={3} title="Industrials News" />

      {/* Newsletter Preview */}
      <NewsletterPreview division="industrials" />

      {/* Division Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Division Resources
          </CardTitle>
          <CardDescription>
            Industrial-specific tools and documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Factory className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Division resources coming soon.</p>
            <p className="text-xs mt-1">Contact your division lead for more information.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
