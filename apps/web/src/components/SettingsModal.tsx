import React, { useState } from "react";
import {
  X,
  Key,
  Cpu,
  Globe,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  ExternalLink
} from "lucide-react";
import { updateApiKey } from "../api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasApiKey: boolean;
  onApiKeyUpdated: (hasKey: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  hasApiKey,
  onApiKeyUpdated,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [language, setLanguage] = useState<"en" | "hi">("en");

  if (!isOpen) return null;

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await updateApiKey(apiKeyInput.trim());
      setStatusMsg({ text: "APINEX API Key saved successfully for this session.", type: "success" });
      onApiKeyUpdated(res.has_api_key);
      setApiKeyInput("");
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to update key", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1020]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel max-w-lg w-full rounded-2xl border border-[#34425D] p-6 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#34425D] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#A78BFA]/15 flex items-center justify-center text-[#A78BFA]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F4F7FC]">Workspace Settings</h3>
              <p className="text-[11px] text-[#B5C1D4]">
                Model, secret keys, and synthesis preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#B5C1D4] hover:text-[#F4F7FC] hover:bg-[#1C2742] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* APINEX Key Management */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#F4F7FC] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#56E6E0]" />
              <span>APINEX API Key</span>
            </label>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                hasApiKey
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
              }`}
            >
              {hasApiKey ? "Active" : "Key Missing (Local Fallback Active)"}
            </span>
          </div>

          <form onSubmit={handleSaveKey} className="space-y-2">
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your APINEX_API_KEY..."
                className="w-full bg-[#0B1020] border border-[#34425D] rounded-xl px-3 py-2 pr-10 text-xs text-[#F4F7FC] placeholder-[#B5C1D4]/50 focus:outline-none focus:border-[#56E6E0] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B5C1D4] hover:text-[#F4F7FC]"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#B5C1D4]">
              <span>Saved locally in memory. Permanent configuration in <code className="text-[#56E6E0]">.env</code></span>
              <button
                type="submit"
                disabled={!apiKeyInput.trim() || isSaving}
                className="btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40"
              >
                {isSaving ? "Saving..." : "Update Key"}
              </button>
            </div>
          </form>

          {statusMsg && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>

        {/* Model Spec Card */}
        <div className="p-3.5 rounded-xl bg-[#1C2742]/50 border border-[#34425D] space-y-2 text-xs">
          <div className="flex items-center justify-between text-[#F4F7FC] font-semibold">
            <span>Configured Blueprint Model</span>
            <span className="font-mono text-[#56E6E0]">free/glm-5.3-flash</span>
          </div>
          <div className="text-[11px] text-[#B5C1D4] space-y-1">
            <p>• Base Endpoint: <code className="text-[#F4F7FC]">https://api.apinex.bond/v1</code></p>
            <p>• Retrieval Engine: FAISS CPU FlatIP (384-dimensional cosine)</p>
            <p>• Token Context Budget: 1500 tokens with untrusted source guardrails</p>
          </div>
        </div>

        {/* Language Preference */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#F4F7FC] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#A78BFA]" />
            <span>Response Language Preference</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                language === "en"
                  ? "bg-[#1C2742] text-[#56E6E0] border-[#56E6E0]/40 font-semibold"
                  : "bg-[#0B1020] text-[#B5C1D4] border-[#34425D] hover:bg-[#1C2742]"
              }`}
            >
              English (Default)
            </button>
            <button
              onClick={() => setLanguage("hi")}
              className={`p-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                language === "hi"
                  ? "bg-[#1C2742] text-[#56E6E0] border-[#56E6E0]/40 font-semibold"
                  : "bg-[#0B1020] text-[#B5C1D4] border-[#34425D] hover:bg-[#1C2742]"
              }`}
            >
              हिंदी (Hindi)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-[#1C2742] hover:bg-[#1C2742]/80 text-[#F4F7FC] border border-[#34425D]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
