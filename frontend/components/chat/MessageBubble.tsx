"use client";

import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface Props {
    message: Message;
}

export const MessageBubble = ({ message }: Props) => {
    const isUser = message.role === "user";

    return (
        <motion.div
            initial={{ opacity: 0, x: isUser ? 20 : -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cn("flex gap-3 mb-4", isUser ? "flex-row-reverse" : "flex-row")}
        >
            {/* Avatar */}
            <div
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    isUser ? "bg-primary/20" : "glassmorphism"
                )}
            >
                {isUser ? (
                    <User className="w-4 h-4 text-primary" />
                ) : (
                    <Bot className="w-4 h-4 text-secondary" />
                )}
            </div>

            {/* Bubble */}
            <div
                className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    isUser
                        ? "bg-primary text-white rounded-br-md"
                        : "glassmorphism rounded-bl-md"
                )}
            >
                {message.content}
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
