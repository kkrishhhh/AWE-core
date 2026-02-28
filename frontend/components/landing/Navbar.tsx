"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
    { label: "Features", href: "#features" },
    { label: "Architecture", href: "#architecture" },
    { label: "Tools", href: "#tools" },
    { label: "How It Works", href: "#how-it-works" },
];

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
                isScrolled
                    ? "bg-background/80 backdrop-blur-2xl border-b border-border/50 shadow-[0_4px_30px_rgba(0,0,0,0.05)]"
                    : "bg-transparent"
            )}
        >
            {/* Animated gradient border at bottom when scrolled */}
            {isScrolled && (
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <div className="absolute inset-0 w-8 h-8 bg-primary/20 rounded-lg blur-lg group-hover:blur-xl opacity-60 group-hover:opacity-100 transition-all" />
                        </div>
                        <span className="text-lg font-bold tracking-tight">AWE</span>
                    </Link>

                    {/* Desktop Nav — pill-shaped container */}
                    <div className="hidden md:flex items-center gap-0.5 px-1.5 py-1 rounded-full glassmorphism">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="nav-link-hover px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="p-2.5 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border"
                                aria-label="Toggle theme"
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={theme}
                                        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                        exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {theme === "dark" ? (
                                            <Sun className="w-4 h-4" />
                                        ) : (
                                            <Moon className="w-4 h-4" />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </button>
                        )}

                        <Link
                            href="/chat"
                            className="hidden sm:flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-medium rounded-xl hover:shadow-[0_0_30px_var(--primary-glow)] hover:scale-[1.02] transition-all active:scale-[0.98]"
                        >
                            Launch App
                        </Link>

                        {/* Mobile hamburger */}
                        <button
                            className="md:hidden p-2 rounded-xl hover:bg-muted border border-transparent hover:border-border"
                            onClick={() => setIsMobileOpen(!isMobileOpen)}
                        >
                            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-background/95 backdrop-blur-2xl border-b border-border"
                    >
                        <div className="px-4 py-4 flex flex-col gap-1">
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="px-4 py-3 text-sm hover:bg-muted rounded-xl transition-colors"
                                    onClick={() => setIsMobileOpen(false)}
                                >
                                    {link.label}
                                </a>
                            ))}
                            <Link
                                href="/chat"
                                className="mt-2 px-4 py-3 bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-medium rounded-xl text-center"
                                onClick={() => setIsMobileOpen(false)}
                            >
                                Launch App
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
