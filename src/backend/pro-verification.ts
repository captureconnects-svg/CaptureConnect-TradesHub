import { supabase } from "@/lib/supabase";
import {
  sendAdminAlertEmail,
  buildAdminVerificationAlertEmail,
  buildDocumentsReceivedEmail,
} from "@/backend/notification-emails";
import { notify } from "@/backend/notify";

export type VerificationStatus = "none" | "pending" | "approved" | "rejected";

export interface VerificationStatusResult {
  status: VerificationStatus;
  requestId?: number;
}

export async function getVerificationStatus(): Promise<VerificationStatusResult> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { status: "none" };

  const { data } = await supabase
    .from("verification_request")
    .select("id, status")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!data) return { status: "none" };
  return { status: data.status as VerificationStatus, requestId: data.id };
}

const VERIFICATION_ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

async function uploadVerificationFile(
  userId: string,
  folder: "id-front" | "id-back" | "facial" | "certificate",
  file: File
): Promise<string> {
  const ext = VERIFICATION_ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF, PDF.");
  const path = `${userId}/${folder}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("verification_documents")
    .upload(path, file, { upsert: true });

  if (error) throw new Error(error.message);
  return path;
}

export async function submitVerificationRequest(files: {
  idFront: File;
  idBack: File;
  facial: File;
  certificate?: File;
}): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated. Please log in and try again.");

  const userId = authData.user.id;

  const [idFrontPath, idBackPath, facialPath] = await Promise.all([
    uploadVerificationFile(userId, "id-front", files.idFront),
    uploadVerificationFile(userId, "id-back", files.idBack),
    uploadVerificationFile(userId, "facial", files.facial),
  ]);

  let certificatePath: string | undefined;
  if (files.certificate) {
    certificatePath = await uploadVerificationFile(userId, "certificate", files.certificate);
  }

  const { data: request, error: requestError } = await supabase
    .from("verification_request")
    .insert({ user_id: userId, status: "pending" })
    .select("id")
    .single();

  if (requestError) throw new Error(requestError.message);

  const docs: { request_id: number; file_type: string; file_path: string }[] = [
    { request_id: request.id, file_type: "id-front", file_path: idFrontPath },
    { request_id: request.id, file_type: "id-back", file_path: idBackPath },
    { request_id: request.id, file_type: "facial", file_path: facialPath },
  ];

  if (certificatePath) {
    docs.push({ request_id: request.id, file_type: "certificate", file_path: certificatePath });
  }

  const { error: docsError } = await supabase
    .from("verification_documents")
    .insert(docs);

  if (docsError) throw new Error(docsError.message);

  // Notify admin + send confirmation to pro (fire-and-forget)
  ;(async () => {
    const { data: profile } = await supabase
      .from("tradesperson_profiles")
      .select("full_name, username, email")
      .eq("id", userId)
      .maybeSingle();
    const proName = String(
      (profile as any)?.username ?? (profile as any)?.full_name ?? "A tradesperson"
    );
    const proEmail = (profile as any)?.email as string | null ?? authData.user.email ?? null;

    await sendAdminAlertEmail(
      "New verification request — Capture Connect",
      buildAdminVerificationAlertEmail(proName, authData.user.email ?? ""),
    );

    if (proEmail) {
      await notify({
        userId,
        userEmail: proEmail,
        title: "Documents received",
        message: "We've received your verification documents. Our team will review them within 1–3 business days.",
        type: "verification",
        emailHtml: buildDocumentsReceivedEmail(proName),
        emailSubject: "Verification documents received — Capture Connect",
      });
    }
  })().catch(() => {});
}
