"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";

const ONBOARDING_KEY = "awe_onboarding_seen";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Show on first visit
        if (!localStorage.getItem(ONBOARDING_KEY)) {
            setShowOnboarding(true);
        }
    }, []);

    const handleCloseOnboarding = () => {
        setShowOnboarding(false);
        localStorage.setItem(ONBOARDING_KEY, "true");
    };

    const handleOpenGuide = () => {
        setShowOnboarding(true);
    };

    return (
        <div className="flex min-h-screen">
            <DashboardSidebar onOpenGuide={handleOpenGuide} />
            <main className="flex-1 overflow-auto dashboard-bg">{children}</main>
            <OnboardingModal
                isOpen={showOnboarding}
                onClose={handleCloseOnboarding}
            />
        </div>
    );
}
