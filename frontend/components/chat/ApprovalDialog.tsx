"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CheckCircle, XCircle } from "lucide-react";

import type { WSApprovalRequest } from "@/types";

interface Props {
    approval: WSApprovalRequest & { taskId: string };
    onRespond: (approved: boolean, feedback: string) => void;
}

export function ApprovalDialog({ approval, onRespond }: Props) {
    const [feedback, setFeedback] = useState("");

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ y: 100, scale: 0.95, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25 }}
                    className="w-full max-w-lg glassmorphism rounded-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-warning" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Agent Needs Your Approval</h3>
                                <p className="text-sm text-muted-foreground">
                                    Review the execution plan below — {approval.plan.steps.length} steps,{" "}
                                    {approval.plan.estimated_complexity} complexity
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="p-6 max-h-[300px] overflow-y-auto space-y-3">
                        {approval.plan.steps.map((step) => (
                            <div
                                key={step.step_number}
                                className="flex gap-3 p-3 rounded-lg bg-muted/50"
                            >
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                    {step.step_number}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm">{step.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground">
                                            Tool: <code className="text-primary">{step.tool_needed}</code>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Feedback */}
                    <div className="px-6 pb-4">
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Optional feedback..."
                            rows={2}
                            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Actions */}
                    <div className="p-6 pt-0 flex gap-3">
                        <button
                            onClick={() => onRespond(true, feedback)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-success text-white font-medium rounded-lg hover:bg-success/90 transition-all"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                        </button>
                        <button
                            onClick={() => onRespond(false, feedback)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-all"
                        >
                            <XCircle className="w-4 h-4" />
                            Reject
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
