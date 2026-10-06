import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { uploadDocument } from "../api";
import { DocumentItem } from "../types";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDoc: DocumentItem) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt", "md"].includes(ext || "")) {
      setErrorMsg("Unsupported file format. Please upload a PDF, DOCX, or TXT file.");
      setSelectedFile(null);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg("File exceeds the 25 MB limit.");
      setSelectedFile(null);
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const doc = await uploadDocument(selectedFile);
      setUploadSuccess(true);
      setTimeout(() => {
        onUploadSuccess(doc);
        onClose();
        setSelectedFile(null);
        setUploadSuccess(false);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1020]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel max-w-lg w-full rounded-2xl border border-[#34425D] p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#56E6E0]/15 flex items-center justify-center text-[#56E6E0]">
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#F4F7FC]">Upload Research Document</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#B5C1D4] hover:text-[#F4F7FC] hover:bg-[#1C2742] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-[#56E6E0] bg-[#56E6E0]/10"
              : "border-[#34425D] hover:border-[#56E6E0]/50 bg-[#0B1020]/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-[#1C2742] flex items-center justify-center text-[#56E6E0]">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F4F7FC]">
                Click or drag & drop files here
              </p>
              <p className="text-xs text-[#B5C1D4] mt-1">
                Supports PDF, DOCX, and TXT up to 25 MB
              </p>
            </div>
          </div>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div className="p-3 rounded-xl bg-[#1C2742] border border-[#34425D] flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-4 h-4 text-[#56E6E0] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F4F7FC] truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] text-[#B5C1D4]">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            {uploadSuccess && (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Uploaded
              </span>
            )}
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#B5C1D4] hover:bg-[#1C2742] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || uploadSuccess}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Ingesting into FAISS...</span>
              </>
            ) : uploadSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready</span>
              </>
            ) : (
              <span>Start Ingestion</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
