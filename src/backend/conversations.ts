import { supabase } from "@/lib/supabase";
import { logActivity } from "@/backend/pro-activity";

export type Conversation = {
  id: number;
  clientId: string;
  tradespersonId: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  createdAt: string;
  lastMsgAt: string | null;
  lastMessage: { content: string; createdAt: string } | null;
};

export type ConversationMessage = {
  id: number;
  convoId: number;
  senderId: string;
  content: string;
  createdAt: string;
  isOwn: boolean;
  fileUrl: string | null;
};

type ConvoRow = {
  id: number;
  client_id: string;
  tradesperson_id: string;
  created_at: string;
  last_msg_at: string | null;
};

export async function fetchConversations(): Promise<Conversation[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];
  const uid = authData.user.id;

  const { data: convos } = await supabase
    .from("conversations")
    .select("id, client_id, tradesperson_id, created_at, last_msg_at")
    .or(`client_id.eq.${uid},tradesperson_id.eq.${uid}`)
    .order("last_msg_at", { ascending: false });

  if (!convos || convos.length === 0) return [];

  const rows = convos as ConvoRow[];

  const clientIds = rows.filter((c) => c.tradesperson_id === uid).map((c) => c.client_id);
  const traderIds = rows.filter((c) => c.client_id === uid).map((c) => c.tradesperson_id);

  const [{ data: clientProfiles }, { data: traderProfiles }] = await Promise.all([
    clientIds.length > 0
      ? supabase.from("client_profiles").select("id, full_name, username").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    traderIds.length > 0
      ? supabase
          .from("tradesperson_profiles")
          .select("id, full_name, username, profile_image")
          .in("id", traderIds)
      : Promise.resolve({ data: [] }),
  ]);

  const clientNameById: Record<string, string> = {};
  for (const cp of clientProfiles ?? []) {
    clientNameById[cp.id as string] =
      (cp.username as string | null)?.trim() ||
      (cp.full_name as string | null)?.trim() ||
      "Client";
  }
  const traderNameById: Record<string, string> = {};
  const traderImageById: Record<string, string | null> = {};
  for (const tp of traderProfiles ?? []) {
    traderNameById[tp.id as string] =
      (tp.username as string | null)?.trim() ||
      (tp.full_name as string | null)?.trim() ||
      "Tradesperson";
    traderImageById[tp.id as string] = tp.profile_image as string | null;
  }

  const convoIds = rows.map((c) => c.id);
  const { data: latestMsgs } = await supabase
    .from("conversations_msg")
    .select("convo_id, content, created_at")
    .in("convo_id", convoIds)
    .order("created_at", { ascending: false });

  const latestByConvoId: Record<number, { content: string; createdAt: string }> = {};
  for (const msg of latestMsgs ?? []) {
    const cid = msg.convo_id as number;
    if (!latestByConvoId[cid]) {
      latestByConvoId[cid] = {
        content: msg.content as string,
        createdAt: msg.created_at as string,
      };
    }
  }

  return rows.map((c) => {
    const isClient = c.client_id === uid;
    const otherPartyId = isClient ? c.tradesperson_id : c.client_id;
    const otherPartyName = isClient
      ? (traderNameById[c.tradesperson_id] ?? "Tradesperson")
      : (clientNameById[c.client_id] ?? "Client");
    const otherPartyImage = isClient ? (traderImageById[c.tradesperson_id] ?? null) : null;

    return {
      id: c.id,
      clientId: c.client_id,
      tradespersonId: c.tradesperson_id,
      otherPartyId,
      otherPartyName,
      otherPartyImage,
      createdAt: c.created_at,
      lastMsgAt: c.last_msg_at,
      lastMessage: latestByConvoId[c.id] ?? null,
    };
  });
}

export async function getOrCreateConversation(tradespersonId: string): Promise<number> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");
  const uid = authData.user.id;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", uid)
    .eq("tradesperson_id", tradespersonId)
    .maybeSingle();

  if (existing) return existing.id as number;

  const { data: newConvo, error } = await supabase
    .from("conversations")
    .insert({ client_id: uid, tradesperson_id: tradespersonId })
    .select("id")
    .single();

  if (error || !newConvo) throw new Error("Failed to create conversation");
  return newConvo.id as number;
}

export async function fetchMessages(convoId: number): Promise<ConversationMessage[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];
  const uid = authData.user.id;

  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", convoId)
    .or(`client_id.eq.${uid},tradesperson_id.eq.${uid}`)
    .maybeSingle();
  if (!convo) return [];

  const { data: msgs } = await supabase
    .from("conversations_msg")
    .select("id, convo_id, sender_id, content, created_at, file_url")
    .eq("convo_id", convoId)
    .order("created_at", { ascending: true });

  if (!msgs || msgs.length === 0) return [];

  const SIGNED_URL_EXPIRY = 3600;
  const messagesWithUrls = await Promise.all(
    msgs.map(async (m) => {
      let fileUrl = m.file_url as string | null;
      // Stored paths (non-http) need a signed URL; old full URLs pass through as-is.
      if (fileUrl && !fileUrl.startsWith("http")) {
        const { data: signed } = await supabase.storage
          .from("conversations")
          .createSignedUrl(fileUrl, SIGNED_URL_EXPIRY);
        fileUrl = signed?.signedUrl ?? null;
      }
      return {
        id: m.id as number,
        convoId: m.convo_id as number,
        senderId: m.sender_id as string,
        content: m.content as string,
        createdAt: m.created_at as string,
        isOwn: m.sender_id === uid,
        fileUrl,
      };
    }),
  );

  return messagesWithUrls;
}

// Resolves a raw realtime row (from the conversations_msg subscription) into a
// ConversationMessage, signing the file URL if it's a stored path.
export async function resolveRealtimeMessage(
  row: { id: number; convo_id: number; sender_id: string; content: string; created_at: string; file_url: string | null },
  uid: string,
): Promise<ConversationMessage> {
  const SIGNED_URL_EXPIRY = 3600;
  let fileUrl = row.file_url;
  if (fileUrl && !fileUrl.startsWith("http")) {
    const { data: signed } = await supabase.storage
      .from("conversations")
      .createSignedUrl(fileUrl, SIGNED_URL_EXPIRY);
    fileUrl = signed?.signedUrl ?? null;
  }

  return {
    id: row.id,
    convoId: row.convo_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
    isOwn: row.sender_id === uid,
    fileUrl,
  };
}

export async function sendMessage(params: {
  convoId: number;
  content: string;
  fileUrl?: string | null | undefined;
  tradespersonId?: string;
}): Promise<ConversationMessage> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error("Not authenticated");
  const uid = authData.user.id;

  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", params.convoId)
    .or(`client_id.eq.${uid},tradesperson_id.eq.${uid}`)
    .maybeSingle();
  if (!convo) throw new Error("Conversation not found or access denied");

  const { data: msgData, error } = await supabase
    .from("conversations_msg")
    .insert({
      convo_id: params.convoId,
      sender_id: uid,
      content: params.content,
      file_url: params.fileUrl ?? null,
    })
    .select("id, convo_id, sender_id, content, created_at, file_url")
    .single();

  if (error || !msgData) throw new Error(error?.message ?? "Failed to send message");

  await supabase
    .from("conversations")
    .update({ last_msg_at: new Date().toISOString() })
    .eq("id", params.convoId);

  if (params.tradespersonId) {
    (async () => {
      const { data: cp } = await supabase
        .from("client_profiles")
        .select("full_name, username")
        .eq("id", uid)
        .single();
      const name =
        (cp?.username as string | null)?.trim() ||
        (cp?.full_name as string | null)?.trim() ||
        "A client";
      await logActivity({
        tradespersonId: params.tradespersonId!,
        activityType: "message",
        description: `${name} sent you a message`,
        clientId: uid,
      });
    })().catch(() => {});
  }

  return {
    id: msgData.id as number,
    convoId: msgData.convo_id as number,
    senderId: msgData.sender_id as string,
    content: msgData.content as string,
    createdAt: msgData.created_at as string,
    isOwn: true,
    fileUrl: msgData.file_url as string | null,
  };
}

const CONVO_ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

async function uploadFileToStorage(convoId: number, file: File): Promise<string> {
  const ext = CONVO_ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("Unsupported file type. Allowed: images, PDF, TXT, DOC, DOCX.");
  const path = `${convoId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("conversations")
    .upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" });

  if (error) throw new Error(error.message || "File upload failed");
  // Return the storage path; fetchMessages generates short-lived signed URLs on read.
  return path;
}

export async function sendMessageWithFile(params: {
  convoId: number;
  content: string;
  file?: File | null;
  tradespersonId?: string;
}): Promise<ConversationMessage> {
  const fileUrl = params.file ? await uploadFileToStorage(params.convoId, params.file) : null;
  return sendMessage({
    convoId: params.convoId,
    content: params.content,
    fileUrl,
    tradespersonId: params.tradespersonId,
  });
}

// Sends one message per file (text goes with the first file).
// Returns all sent messages so the caller can append them all to state.
export async function sendMessageWithAttachments(params: {
  convoId: number;
  content: string;
  files: File[];
  tradespersonId?: string;
}): Promise<ConversationMessage[]> {
  if (params.files.length === 0) {
    const msg = await sendMessage({
      convoId: params.convoId,
      content: params.content,
      tradespersonId: params.tradespersonId,
    });
    return [msg];
  }

  const results: ConversationMessage[] = [];
  for (let i = 0; i < params.files.length; i++) {
    const fileUrl = await uploadFileToStorage(params.convoId, params.files[i]);
    const msg = await sendMessage({
      convoId: params.convoId,
      content: i === 0 ? params.content : "",
      fileUrl: fileUrl,
      tradespersonId: i === 0 ? params.tradespersonId : undefined,
    });
    results.push(msg);
  }
  return results;
}
