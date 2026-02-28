import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ArchitectureSection } from "@/components/landing/ArchitectureSection";
import { ToolsGrid } from "@/components/landing/ToolsGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { HighlightsSection } from "@/components/landing/HighlightsSection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <DashboardPreview />
      <FeaturesSection />
      <ArchitectureSection />
      <ToolsGrid />
      <HowItWorks />
      <HighlightsSection />
      <Footer />
    </main>
  );
}
