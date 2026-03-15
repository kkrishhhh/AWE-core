"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, User, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface Props {
    message: Message;
}

export const MessageBubble = ({ message }: Props) => {
    const isUser = message.role === "user";
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: isUser ? 20 : -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cn("flex gap-3 mb-4 group", isUser ? "flex-row-reverse" : "flex-row")}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    isUser
                        ? "bg-gradient-to-br from-primary to-secondary"
                        : "glassmorphism"
                )}
            >
                {isUser ? (
                    <User className="w-4 h-4 text-white" />
                ) : (
                    <Bot className="w-4 h-4 text-secondary" />
                )}
            </div>

            {/* Bubble */}
            <div
                className={cn(
                    "relative max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    isUser
                        ? "bg-gradient-to-r from-primary to-primary/90 text-white rounded-br-md"
                        : "glassmorphism rounded-bl-md"
                )}
            >
                {/* Copy button — shown on hover for assistant messages */}
                {!isUser && (
                    <button
                        onClick={handleCopy}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-md p-1 shadow-sm hover:bg-muted"
                    >
                        {copied ? (
                            <Check className="w-3 h-3 text-success" />
                        ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                        )}
                    </button>
                )}

                {/* Content — render with whitespace preservation */}
                <div className="whitespace-pre-wrap break-words">
                    {message.content}
                </div>

                <div
                    className={cn(
                        "text-[10px] mt-1.5",
                        isUser ? "text-white/60" : "text-muted-foreground"
                    )}
                >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            </div>
        </motion.div>
    );
};
