"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    FolderOpen,
    Upload,
    FileText,
    Loader2,
    CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDocuments, uploadDocument } from "@/lib/api";

export default function DocumentsPage() {
    const queryClient = useQueryClient();
    const [text, setText] = useState("");
    const [source, setSource] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const { data: documents, isLoading } = useQuery({
        queryKey: ["documents"],
        queryFn: getDocuments,
    });

    const handleUpload = useCallback(async () => {
        if (!text.trim()) return;
        setIsUploading(true);
        try {
            const res = await uploadDocument(text.trim(), source || "user_upload");
            setUploadSuccess(`Ingested ${res.chunks} chunks`);
            setText("");
            setSource("");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            setTimeout(() => setUploadSuccess(null), 3000);
        } catch (err) {
            console.error("Upload failed:", err);
        }
        setIsUploading(false);
    }, [text, source, queryClient]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;

        const textExtensions = [".txt", ".md", ".csv", ".json", ".xml", ".html", ".log", ".py", ".js", ".ts", ".yaml", ".yml", ".env", ".cfg", ".ini"];
        const isTextFile = file.type.startsWith("text") || textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

        if (isTextFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setText(event.target?.result as string);
                setSource(file.name);
            };
            reader.readAsText(file);
        } else {
            alert("Please upload a text-based file (.txt, .md, .csv, .json, etc.). PDF support coming soon!");
        }
    }, []);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-primary" />
                    Documents
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Ingest documents into the RAG knowledge base for agent retrieval.
                </p>
            </div>

            {/* Upload Zone */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={cn(
                        "glassmorphism rounded-2xl p-8 border-2 border-dashed transition-all",
                        isDragOver
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/30"
                    )}
                >
                    <div className="flex flex-col items-center gap-4 mb-6">
                        <Upload
                            className={cn(
                                "w-10 h-10 transition-colors",
                                isDragOver ? "text-primary" : "text-muted-foreground"
                            )}
                        />
                        <p className="text-sm text-muted-foreground">
                            Drag & drop a text file, or paste content below
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                Source Name
                            </label>
                            <input
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                                placeholder="e.g. project_docs, meeting_notes..."
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">
                                Document Text
                            </label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste your document content here..."
                                rows={6}
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleUpload}
                                disabled={!text.trim() || isUploading}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all",
                                    text.trim() && !isUploading
                                        ? "bg-primary text-white hover:bg-primary/90 hover:shadow-[0_0_20px_var(--primary-glow)]"
                                        : "bg-muted text-muted-foreground cursor-not-allowed"
                                )}
                            >
                                {isUploading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                Ingest Document
                            </button>
                            {uploadSuccess && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-1 text-sm text-success"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {uploadSuccess}
                                </motion.span>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Documents List */}
            <div>
                <h2 className="text-lg font-semibold mb-4">
                    Ingested Documents
                    {documents && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            ({documents.total_documents} docs, {documents.total_chunks} chunks)
                        </span>
                    )}
                </h2>

                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents?.documents?.map((doc) => (
                        <motion.div
                            key={doc.document_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -2 }}
                            className="glassmorphism rounded-xl p-4 group"
                        >
                            <div className="flex items-start gap-3">
                                <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.source}</p>
                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                        {doc.document_id.slice(0, 12)}...
                                    </p>
                                </div>
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                                    {doc.chunks} chunks
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {documents?.documents?.length === 0 && (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                        No documents ingested yet. Upload one above.
                    </div>
                )}
            </div>
        </div>
    );
}
