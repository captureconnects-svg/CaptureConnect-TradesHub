import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Hammer,
  Upload,
  Camera,
  FileText,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  X,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  UserCheck,
  Award,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { submitVerificationRequest, getVerificationStatus } from "@/backend/pro-verification";

export const Route = createFileRoute("/pro-verification")({
  head: () => ({
    meta: [
      { title: "Identity Verification — Capture Connect" },
      {
        name: "description",
        content: "Complete your identity verification to activate your TradeHub pro account.",
      },
    ],
  }),
  component: ProVerificationPage,
});

type Step = 1 | 2 | 3;

// ─── File Upload Zone ─────────────────────────────────────────────────────────

interface FileUploadZoneProps {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
  accept: string;
  hint?: string;
}

function FileUploadZone({ label, file, onFile, accept, hint }: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="relative rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="h-14 w-14 object-cover rounded-md shrink-0 border border-border"
            />
          ) : (
            <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="shrink-0 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors p-6 flex flex-col items-center gap-2.5 group"
        >
          <div className="h-10 w-10 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium group-hover:text-primary transition-colors">
              Click to upload
            </p>
            {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
          </div>
        </button>
      )}
    </div>
  );
}

// ─── Step 1 — Government ID ───────────────────────────────────────────────────

function StepOne({
  idFront,
  idBack,
  onIdFront,
  onIdBack,
}: {
  idFront: File | null;
  idBack: File | null;
  onIdFront: (f: File | null) => void;
  onIdBack: (f: File | null) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Government-issued ID</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a clear photo of both sides of your passport, driver's licence, or national ID
          card.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FileUploadZone
          label="Front of ID"
          file={idFront}
          onFile={onIdFront}
          accept="image/*,application/pdf"
          hint="All four corners visible"
        />
        <FileUploadZone
          label="Back of ID"
          file={idBack}
          onFile={onIdBack}
          accept="image/*,application/pdf"
          hint="Include the barcode or signature strip"
        />
      </div>
      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Requirements</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Clear, unobstructed photo — no blurring or glare</li>
          <li>All four corners of the document must be visible</li>
          <li>Accepted formats: JPG, PNG, PDF</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Step 2 — Facial Verification ─────────────────────────────────────────────

function StepTwo({
  videoRef,
  cameraActive,
  cameraError,
  facialPreviewUrl,
  onStartCamera,
  onCapture,
  onRetake,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  cameraError: string | null;
  facialPreviewUrl: string | null;
  onStartCamera: () => void;
  onCapture: () => void;
  onRetake: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Selfie Verification</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Take a live photo of yourself so we can verify your identity matches your ID documents.
        </p>
      </div>

      <div className="space-y-3">
        {/* Video element always stays in the DOM so the ref is available when startCamera runs */}
        <div
          className={`relative rounded-lg overflow-hidden border border-border bg-black ${
            cameraActive && !facialPreviewUrl ? "block" : "hidden"
          }`}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-72 object-cover"
          />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <Button onClick={onCapture} size="sm" className="gap-2 shadow-lg px-5">
              <Camera className="h-4 w-4" />
              Capture Photo
            </Button>
          </div>
        </div>

        {facialPreviewUrl && (
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={facialPreviewUrl}
              alt="Captured selfie"
              className="w-full max-h-72 object-cover"
            />
            <div className="absolute top-2 right-2">
              <Button size="sm" variant="secondary" onClick={onRetake} className="gap-1.5 shadow">
                <RotateCcw className="h-3.5 w-3.5" />
                Retake
              </Button>
            </div>
            <div className="absolute bottom-2 left-2 bg-green-600/90 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              Photo captured
            </div>
          </div>
        )}

        {!cameraActive && !facialPreviewUrl && (
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <p className="font-medium">Camera access required</p>
              <p className="text-sm text-muted-foreground mt-1">
                Allow camera access to take a live selfie for verification.
              </p>
            </div>
            {cameraError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {cameraError}
              </p>
            )}
            <Button onClick={onStartCamera} className="gap-2">
              <Camera className="h-4 w-4" />
              Open Camera
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Tips for a good selfie</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Look directly into the camera in good lighting</li>
          <li>Remove glasses, hats, or anything covering your face</li>
          <li>Ensure your full face fits within the frame</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Step 3 — Certificate ─────────────────────────────────────────────────────

function StepThree({
  certificate,
  onCertificate,
}: {
  certificate: File | null;
  onCertificate: (f: File | null) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Professional Certificate</h2>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
            Optional
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Upload your trade licence, qualification, or professional certification. This increases
          client trust in your profile.
        </p>
      </div>

      <FileUploadZone
        label="Certificate or Licence"
        file={certificate}
        onFile={onCertificate}
        accept="image/*,application/pdf"
        hint="PDF, PNG, or JPG accepted"
      />

      <p className="text-xs text-muted-foreground text-center">
        This step is optional — click <strong>Submit</strong> below to skip it and send your
        application without a certificate.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ProVerificationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [facialImage, setFacialImage] = useState<File | null>(null);
  const [facialPreviewUrl, setFacialPreviewUrl] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Redirect if already submitted
  useEffect(() => {
    getVerificationStatus().then(({ status }) => {
      if (status === "pending") {
        toast.info("Your verification is already pending review.");
        navigate({ to: "/" });
      } else if (status === "approved") {
        navigate({ to: "/pro-dashboard" });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      // Set srcObject before updating state so the video element already has the
      // stream when it becomes visible after the re-render.
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setCameraError(
        "Could not access your camera. Please check browser permissions and try again."
      );
    }
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "facial-capture.jpg", { type: "image/jpeg" });
        setFacialImage(file);
        setFacialPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function retakePhoto() {
    if (facialPreviewUrl) URL.revokeObjectURL(facialPreviewUrl);
    setFacialImage(null);
    setFacialPreviewUrl(null);
    startCamera();
  }

  function goToStep(next: Step) {
    if (next !== 2) stopCamera();
    setStep(next);
  }

  async function handleSubmit() {
    if (!idFront || !idBack || !facialImage) return;
    setSubmitting(true);
    try {
      await submitVerificationRequest({
        idFront,
        idBack,
        facial: facialImage,
        certificate: certificate ?? undefined,
      });
      toast.success(
        "Verification submitted! We'll review your documents and notify you once approved."
      );
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Checking verification status…</p>
        </div>
      </div>
    );
  }

  const STEP_CONFIG = [
    { num: 1 as Step, label: "Government ID", icon: CreditCard },
    { num: 2 as Step, label: "Face Verification", icon: UserCheck },
    { num: 3 as Step, label: "Certificate", icon: Award },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Hammer className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base">Capture Connect Pro</span>
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Secure Verification</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-start py-8 px-4 sm:px-6">
        <div className="w-full max-w-lg space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Identity Verification</h1>
            <p className="text-muted-foreground text-sm">
              Complete the steps below to verify your identity and activate your pro account.
            </p>
          </div>

          {/* Stepper */}
          <div className="space-y-3">
            <div className="flex items-center">
              {STEP_CONFIG.map(({ num, icon: Icon }, i) => (
                <React.Fragment key={num}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-200 shrink-0 ${
                        step > num
                          ? "bg-primary border-primary"
                          : step === num
                            ? "border-primary bg-background"
                            : "border-border bg-background"
                      }`}
                    >
                      {step > num ? (
                        <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <Icon
                          className={`h-4 w-4 ${step === num ? "text-primary" : "text-muted-foreground"}`}
                        />
                      )}
                    </div>
                  </div>
                  {i < STEP_CONFIG.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 bg-border relative overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 bg-primary transition-all duration-300 ${step > num ? "w-full" : "w-0"}`}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between px-1">
              {STEP_CONFIG.map(({ num, label }) => (
                <span
                  key={num}
                  className={`text-xs font-medium ${step === num ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Step card */}
          <div className="rounded-xl border border-border bg-card p-6">
            {step === 1 && (
              <StepOne
                idFront={idFront}
                idBack={idBack}
                onIdFront={setIdFront}
                onIdBack={setIdBack}
              />
            )}
            {step === 2 && (
              <StepTwo
                videoRef={videoRef}
                cameraActive={cameraActive}
                cameraError={cameraError}
                facialPreviewUrl={facialPreviewUrl}
                onStartCamera={startCamera}
                onCapture={capturePhoto}
                onRetake={retakePhoto}
              />
            )}
            {step === 3 && (
              <StepThree certificate={certificate} onCertificate={setCertificate} />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {step > 1 ? (
              <Button variant="outline" onClick={() => goToStep((step - 1) as Step)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                onClick={() => goToStep((step + 1) as Step)}
                disabled={step === 1 ? !idFront || !idBack : !facialImage}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
