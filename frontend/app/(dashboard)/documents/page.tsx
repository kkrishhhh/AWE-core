"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    FolderOpen,
    Upload,
    FileText,
    Loader2,
    CheckCircle2,
    AlertCircle,
    MessageSquare,
    ArrowRight,
    File,
    X,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDocuments, uploadDocument, uploadFile, deleteDocument } from "@/lib/api";
import Link from "next/link";

export default function DocumentsPage() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState("");
    const [source, setSource] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
    const [pendingFile, setPendingFile] = useState<globalThis.File | null>(null);

    const { data: documents, isLoading } = useQuery({
        queryKey: ["documents"],
        queryFn: () => getDocuments(),
    });

    const handleUpload = useCallback(async () => {
        if (!text.trim() && !pendingFile) return;
        setIsUploading(true);
        setUploadError(null);
        try {
            let res;
            if (pendingFile) {
                res = await uploadFile(pendingFile, source || pendingFile.name);
            } else {
                res = await uploadDocument(text.trim(), source || "user_upload");
            }
            setUploadSuccess(`✅ Document uploaded — ${res.chunks} chunks created. You can now ask questions about it in Chat!`);
            setText("");
            setSource("");
            setSelectedFileName(null);
            setPendingFile(null);
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            setTimeout(() => setUploadSuccess(null), 8000);
        } catch (err: any) {
            console.error("Upload failed:", err);
            setUploadError(err.message || "Upload failed. Make sure the backend is running on port 8001.");
            setTimeout(() => setUploadError(null), 6000);
        }
        setIsUploading(false);
    }, [text, source, pendingFile]);

    const readFile = useCallback((file: globalThis.File) => {
        const supportedExtensions = [".txt", ".md", ".csv", ".json", ".xml", ".html", ".log", ".py", ".js", ".ts", ".yaml", ".yml", ".env", ".cfg", ".ini", ".tsx", ".jsx", ".css", ".sql", ".pdf", ".docx"];
        const isSupported = file.type.startsWith("text") || supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

        if (isSupported) {
            setPendingFile(file);
            setText(`[${file.name} — content will be extracted on the server]`);
            setSource(file.name);
            setSelectedFileName(file.name);
        } else {
            setUploadError(`"${file.name}" is not supported. Supported: .txt, .csv, .json, .pdf, .docx, etc.`);
            setTimeout(() => setUploadError(null), 5000);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) readFile(file);
    }, [readFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) readFile(file);
    }, [readFile]);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-primary" />
                    Knowledge Base
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Upload documents to teach the AI. Then go to <Link href="/chat" className="text-primary hover:underline font-medium">Chat</Link> and ask questions about them.
                </p>
            </div>

            {/* How It Works */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glassmorphism rounded-2xl p-5 mb-6"
            >
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">How it works</h3>
                <div className="flex items-center gap-3 text-sm flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium">
                        <Upload className="w-4 h-4" />
                        Upload a file
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/10 text-secondary font-medium">
                        <FileText className="w-4 h-4" />
                        AI learns from it
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success font-medium">
                        <MessageSquare className="w-4 h-4" />
                        Ask questions in Chat
                    </div>
                </div>
            </motion.div>

            {/* Success/Error Messages */}
            <AnimatePresence>
                {uploadSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20 text-sm"
                    >
                        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                        <span className="flex-1">{uploadSuccess}</span>
                        <Link href="/chat" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 font-medium text-sm transition-colors">
                            Go to Chat <ArrowRight className="w-3 h-3" />
                        </Link>
                    </motion.div>
                )}
                {uploadError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-error/10 border border-error/20 text-sm"
                    >
                        <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                        <span className="flex-1 text-error">{uploadError}</span>
                        <button onClick={() => setUploadError(null)} className="text-error/60 hover:text-error">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Zone */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv,.json,.xml,.html,.log,.py,.js,.ts,.yaml,.yml,.env,.cfg,.ini,.tsx,.jsx,.css,.sql,.pdf,.docx"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    className={cn(
                        "glassmorphism rounded-2xl p-8 border-2 border-dashed transition-all cursor-pointer",
                        isDragOver
                            ? "border-primary bg-primary/5 scale-[1.01]"
                            : "border-border hover:border-primary/30"
                    )}
                    onClick={() => !text && fileInputRef.current?.click()}
                >
                    {!text ? (
                        /* Empty state — invite to upload */
                        <div className="flex flex-col items-center gap-4">
                            <div className={cn(
                                "w-16 h-16 rounded-2xl flex items-center justify-center transition-all",
                                isDragOver ? "bg-primary/20" : "bg-muted"
                            )}>
                                <Upload className={cn(
                                    "w-8 h-8 transition-colors",
                                    isDragOver ? "text-primary" : "text-muted-foreground"
                                )} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium">
                                    Drag & drop a file here, or{" "}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                        className="text-primary hover:underline font-semibold"
                                    >
                                        browse files
                                    </button>
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Supports .txt, .md, .csv, .json, .pdf, .py, .js, .yaml and more
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* File loaded — show form */
                        <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                            {selectedFileName && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                                    <File className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium text-primary">{selectedFileName}</span>
                                    <button
                                        onClick={() => { setText(""); setSource(""); setSelectedFileName(null); }}
                                        className="ml-auto text-primary/60 hover:text-primary"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">
                                    Document Name
                                </label>
                                <input
                                    value={source}
                                    onChange={(e) => setSource(e.target.value)}
                                    placeholder="e.g. company_faq, meeting_notes..."
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">
                                    Content Preview
                                </label>
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Paste your document content here..."
                                    rows={6}
                                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary transition-colors font-mono"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleUpload}
                                    disabled={(!text.trim() && !pendingFile) || isUploading}
                                    className={cn(
                                        "flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all",
                                        (text.trim() || pendingFile) && !isUploading
                                            ? "bg-primary text-white hover:bg-primary/90 hover:shadow-[0_0_20px_var(--primary-glow)]"
                                            : "bg-muted text-muted-foreground cursor-not-allowed"
                                    )}
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    Upload to Knowledge Base
                                </button>
                                <button
                                    onClick={() => { setText(""); setSource(""); setSelectedFileName(null); }}
                                    className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Documents List */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Uploaded Documents
                    {documents && (
                        <span className="text-sm font-normal text-muted-foreground ml-1">
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
                    {documents?.documents?.map((doc: any, i: number) => (
                        <motion.div
                            key={doc.document_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -2, scale: 1.01 }}
                            className="glassmorphism rounded-xl p-4 group cursor-default"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.source}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {doc.chunks} chunks indexed
                                    </p>
                                </div>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!confirm("Remove this document from the knowledge base?")) return;
                                        try {
                                            await deleteDocument(doc.document_id);
                                            queryClient.invalidateQueries({ queryKey: ["documents"] });
                                            setUploadSuccess("Document removed successfully.");
                                            setTimeout(() => setUploadSuccess(null), 4000);
                                        } catch (err: any) {
                                            setUploadError(err.message || "Failed to delete document.");
                                            setTimeout(() => setUploadError(null), 5000);
                                        }
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-error/10 text-muted-foreground hover:text-error flex-shrink-0"
                                    title="Remove document"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {documents?.documents?.length === 0 && (
                    <div className="text-center py-16 glassmorphism rounded-2xl">
                        <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground font-medium">No documents uploaded yet</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Upload a file above to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
}
