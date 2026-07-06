"use client";

import { useState, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { compressImageToTarget, ImageTooLargeError } from "@/lib/compress-image";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ID_TYPE_OPTIONS = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PAN", label: "PAN Card" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
  { value: "VOTER_ID", label: "Voter ID" },
] as const;

type IdType = (typeof ID_TYPE_OPTIONS)[number]["value"];

interface PhotoSideState {
  file: File | null;
  compressedImage: string | null;
  preview: string | null;
  originalSize: number;
  compressedSize: number;
  compressing: boolean;
  error: string;
}

const emptyPhotoState: PhotoSideState = {
  file: null,
  compressedImage: null,
  preview: null,
  originalSize: 0,
  compressedSize: 0,
  compressing: false,
  error: "",
};

function PhotoUploadField({
  label,
  state,
  onFileSelected,
}: {
  label: string;
  state: PhotoSideState;
  onFileSelected: (_file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
        Government ID Photo — {label} <span style={{ color: "#D32F2F" }}>*</span>
      </label>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full rounded-lg border-2 border-dashed px-4 py-4 text-sm transition-colors text-center"
        style={{
          borderColor: state.file ? "#3B7A57" : "#e2e8f0",
          backgroundColor: state.file ? "rgba(59,122,87,0.05)" : "#fafafa",
          color: "#64748b",
        }}
      >
        {state.file ? (
          <span style={{ color: "#3B7A57" }}>{state.file.name} — tap to change</span>
        ) : (
          <span>
            Tap to upload {label.toLowerCase()} photo
            <br />
            <span className="text-xs" style={{ color: "#94a3b8" }}>
              JPG, PNG or WEBP accepted
            </span>
          </span>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFileSelected(file);
        }}
        className="hidden"
        aria-label={`Upload government ID photo (${label})`}
      />

      {state.preview && (
        <div className="mt-3">
          {state.compressing ? (
            <div
              className="flex h-32 items-center justify-center rounded-lg border"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div
                className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: "#3B7A57", borderTopColor: "transparent" }}
              />
              <span className="ml-2 text-xs" style={{ color: "#64748b" }}>
                Compressing…
              </span>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.preview}
                alt={`${label} ID preview`}
                className="w-full rounded-lg border object-cover"
                style={{ aspectRatio: "3/2", borderColor: "#e2e8f0", objectFit: "cover" }}
              />
              {state.compressedSize > 0 && (
                <div className="mt-1.5 flex gap-2 text-xs" style={{ color: "#64748b" }}>
                  <span>Original: {formatBytes(state.originalSize)}</span>
                  <span>→</span>
                  <span style={{ color: "#2E7D32" }}>Compressed: {formatBytes(state.compressedSize)}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {state.error && (
        <p className="mt-1.5 text-xs" style={{ color: "#D32F2F" }}>
          {state.error}
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");
  const [governmentIdType, setGovernmentIdType] = useState<IdType | "">("");
  const [governmentIdNumber, setGovernmentIdNumber] = useState("");

  const [frontPhoto, setFrontPhoto] = useState<PhotoSideState>(emptyPhotoState);
  const [backPhoto, setBackPhoto] = useState<PhotoSideState>(emptyPhotoState);

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<
    "idle" | "uploading-front" | "uploading-back" | "submitting"
  >("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handlePhotoChange(
    file: File,
    setState: React.Dispatch<React.SetStateAction<PhotoSideState>>
  ) {
    setState((s) => ({
      ...s,
      file,
      originalSize: file.size,
      compressedImage: null,
      compressedSize: 0,
      compressing: true,
      error: "",
      preview: URL.createObjectURL(file),
    }));

    try {
      const compressed = await compressImageToTarget(file);
      const approxBytes = Math.round((compressed.length * 3) / 4);
      setState((s) => ({
        ...s,
        compressedImage: compressed,
        compressedSize: approxBytes,
        preview: compressed,
        error: "",
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof ImageTooLargeError
            ? err.message
            : "Failed to process image. Please try a different file.",
        compressedImage: null,
        compressedSize: 0,
      }));
    } finally {
      setState((s) => ({ ...s, compressing: false }));
    }
  }

  async function uploadPhoto(imageData: string): Promise<{ url: string; publicId?: string }> {
    const uploadRes = await fetch("/api/auth/register-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData }),
    });
    const uploadData: { url?: string; publicId?: string; error?: string } = await uploadRes
      .json()
      .catch(() => ({}));
    if (!uploadRes.ok || !uploadData.url) {
      throw new Error(uploadData.error || "Image upload failed.");
    }
    return { url: uploadData.url, publicId: uploadData.publicId };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      setError("Mobile number must be exactly 10 digits.");
      return;
    }
    if (!address.trim()) {
      setError("Address is required.");
      return;
    }
    if (!governmentIdType) {
      setError("Please select a Government ID type.");
      return;
    }
    if (!governmentIdNumber.trim()) {
      setError("Government ID number is required.");
      return;
    }
    if (!frontPhoto.compressedImage) {
      setError("Please upload the front photo of your Government ID.");
      return;
    }
    if (!backPhoto.compressedImage) {
      setError("Please upload the back photo of your Government ID.");
      return;
    }

    setSubmitting(true);

    try {
      setUploadProgress("uploading-front");
      const front = await uploadPhoto(frontPhoto.compressedImage);

      setUploadProgress("uploading-back");
      const back = await uploadPhoto(backPhoto.compressedImage);

      setUploadProgress("submitting");
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          mobileNumber,
          address: address.trim(),
          governmentIdType,
          governmentIdNumber: governmentIdNumber.trim(),
          governmentIdFrontUrl: front.url,
          governmentIdFrontPublicId: front.publicId,
          governmentIdBackUrl: back.url,
          governmentIdBackPublicId: back.publicId,
        }),
      });
      const regData: { id?: string; error?: string } = await regRes.json().catch(() => ({}));
      if (!regRes.ok) {
        setError(regData.error || "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress("idle");
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ backgroundColor: "#F8F5EE" }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: "#E8F5E9" }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2E7D32"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2
            className="mb-3 text-2xl font-bold"
            style={{ color: "#1a1a1a" }}
          >
            Registration Submitted!
          </h2>
          <p className="mb-8 text-sm leading-relaxed" style={{ color: "#64748b" }}>
            Your request has been submitted successfully. The administrator will
            review your application and provide your login credentials after
            approval.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#1E4D3D", color: "#F8F5EE" }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F8F5EE" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b"
        style={{ backgroundColor: "#1E4D3D", borderColor: "rgba(248,245,238,0.1)" }}
      >
        <button
          onClick={() => router.push("/login")}
          className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
          style={{ color: "#F8F5EE" }}
          aria-label="Back to login"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-semibold" style={{ color: "#F8F5EE" }}>
            New Employee Account
          </h1>
          <p className="text-xs" style={{ color: "rgba(248,245,238,0.6)" }}>
            Submit your details for admin approval
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-6">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "#374151" }}
                >
                  Full Name <span style={{ color: "#D32F2F" }}>*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-colors"
                  style={{
                    borderColor: "#e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#1a1a1a",
                  }}
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label
                  htmlFor="mobileNumber"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "#374151" }}
                >
                  Mobile Number <span style={{ color: "#D32F2F" }}>*</span>
                </label>
                <input
                  id="mobileNumber"
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) =>
                    setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit mobile number"
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-colors"
                  style={{
                    borderColor: "#e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#1a1a1a",
                  }}
                  maxLength={10}
                />
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "#374151" }}
                >
                  Address <span style={{ color: "#D32F2F" }}>*</span>
                </label>
                <textarea
                  id="address"
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Your full address"
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-colors resize-none"
                  style={{
                    borderColor: "#e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#1a1a1a",
                  }}
                />
              </div>

              {/* Government ID Type */}
              <div>
                <label
                  htmlFor="governmentIdType"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "#374151" }}
                >
                  Government ID Type <span style={{ color: "#D32F2F" }}>*</span>
                </label>
                <select
                  id="governmentIdType"
                  required
                  value={governmentIdType}
                  onChange={(e) =>
                    setGovernmentIdType(e.target.value as IdType)
                  }
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-colors appearance-none"
                  style={{
                    borderColor: "#e2e8f0",
                    backgroundColor: "#ffffff",
                    color: governmentIdType ? "#1a1a1a" : "#94a3b8",
                  }}
                >
                  <option value="" disabled>
                    Select ID type
                  </option>
                  {ID_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Government ID Number */}
              <div>
                <label
                  htmlFor="governmentIdNumber"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "#374151" }}
                >
                  Government ID Number <span style={{ color: "#D32F2F" }}>*</span>
                </label>
                <input
                  id="governmentIdNumber"
                  type="text"
                  required
                  value={governmentIdNumber}
                  onChange={(e) => setGovernmentIdNumber(e.target.value)}
                  placeholder="Enter the ID number as printed on your document"
                  className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2 transition-colors"
                  style={{
                    borderColor: "#e2e8f0",
                    backgroundColor: "#ffffff",
                    color: "#1a1a1a",
                  }}
                />
                <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
                  Recorded for your file only — not verified against any government database.
                </p>
              </div>

              {/* Government ID Photos — Front & Back */}
              <PhotoUploadField
                label="Front"
                state={frontPhoto}
                onFileSelected={(file) => handlePhotoChange(file, setFrontPhoto)}
              />
              <PhotoUploadField
                label="Back"
                state={backPhoto}
                onFileSelected={(file) => handlePhotoChange(file, setBackPhoto)}
              />

              {/* Error */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm"
                  style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
                  role="alert"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || frontPhoto.compressing || backPhoto.compressing}
                className="w-full rounded-lg py-3 px-4 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2"
                style={{
                  backgroundColor:
                    submitting || frontPhoto.compressing || backPhoto.compressing
                      ? "#3B7A57"
                      : "#1E4D3D",
                  color: "#F8F5EE",
                  opacity: submitting || frontPhoto.compressing || backPhoto.compressing ? 0.85 : 1,
                  cursor:
                    submitting || frontPhoto.compressing || backPhoto.compressing
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {submitting ? (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="animate-spin"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    {uploadProgress === "uploading-front"
                      ? "Uploading front photo…"
                      : uploadProgress === "uploading-back"
                      ? "Uploading back photo…"
                      : "Submitting…"}
                  </>
                ) : (
                  "Submit Registration"
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs" style={{ color: "#94a3b8" }}>
            Already have an account?{" "}
            <a
              href="/login"
              className="font-medium"
              style={{ color: "#1E4D3D" }}
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
