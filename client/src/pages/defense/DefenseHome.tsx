import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, Sparkles, Building2, Star } from "lucide-react";
import { Link } from "wouter";
import LatestNews from "@/components/LatestNews";
import NewsletterPreview from "@/components/NewsletterPreview";
import DivisionBulletins from "@/components/DivisionBulletins";
import InlineSearch from "@/components/InlineSearch";
import heroDefenseImg from "@assets/stock_images/military_fighter_jet_e81d120d.jpg";

export default function DefenseHome() {
  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto space-y-6">
      {/* Hero Section - Premium Design with Defense Image */}
      <div className="relative overflow-hidden rounded-lg shadow-lg">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroDefenseImg})` }}
        />
        {/* Dark Gradient Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f]/90 via-[#0d2137]/85 to-[#51142a]/80" />
        
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
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border-2 border-[#1e3a5f] animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/20 text-white border-white/30 text-xs font-medium">
                  Defense Division
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Albers Defense
              </h1>
              <p className="text-lg text-white/80">
                Defense Division Portal
              </p>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-white/70 mb-6 leading-relaxed">
            Welcome to the Albers Defense division hub. Access defense-specific resources, 
            news, and tools for our defense operations and programs.
          </p>
          
          {/* Search Bar with Enhanced Styling */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
            <InlineSearch />
          </div>
          
          {/* Quick Stats Row */}
          <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              <span className="text-white/60 text-sm">Defense Operations</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white/60" />
              <span className="text-white/60 text-sm">DoD Programs</span>
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
      <DivisionBulletins division="defense" limit={5} title="Defense Bulletins" />

      {/* News */}
      <LatestNews division="defense" limit={3} title="Defense News" />

      {/* Newsletter Preview */}
      <NewsletterPreview division="defense" />
    </div>
  );
}
