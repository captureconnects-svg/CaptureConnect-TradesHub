import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Paperclip, Send, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardHeader } from "@/components/trade/DashboardHeader";
import {
  fetchConversations,
  fetchMessages,
  sendMessageWithFile,
  type Conversation,
  type ConversationMessage,
} from "@/backend/conversations";
import { toast } from "sonner";

export const Route = createFileRoute("/client-dashboard/messages")({
  head: () => ({
    meta: [
      { title: "Messages — TradeHub" },
      { name: "description", content: "Your conversations with tradespeople on TradeHub." },
    ],
  }),
  component: MessagesPage,
});

function relTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function Bubble({ who, time, children }: { who: "me" | "them"; time: string; children: ReactNode }) {
  const me = who === "me";
  const formattedTime = new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`flex flex-col ${me ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
          me ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {children}
      </div>
      <span className="text-xs text-muted-foreground mt-0.5 px-1">{formattedTime}</span>
    </div>
  );
}

function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations()
      .then((convos) => {
        setConversations(convos);
        if (convos.length > 0) setActiveConvoId(convos[0].id);
      })
      .catch(() => toast.error("Failed to load conversations."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeConvoId === null) return;
    setMsgLoading(true);
    fetchMessages(activeConvoId)
      .then(setMessages)
      .catch(() => toast.error("Failed to load messages."))
      .finally(() => setMsgLoading(false));
  }, [activeConvoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeConvo = conversations.find((c) => c.id === activeConvoId) ?? null;

  async function handleSend() {
    if ((!input.trim() && !file) || activeConvoId === null || sending) return;
    setSending(true);
    try {
      const msg = await sendMessageWithFile({
        convoId: activeConvoId,
        content: input.trim(),
        file,
        tradespersonId: activeConvo?.tradespersonId,
      });
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvoId
            ? { ...c, lastMessage: { content: msg.content, createdAt: msg.createdAt }, lastMsgAt: msg.createdAt }
            : c
        )
      );
      setInput("");
      setFile(null);
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader likedCount={0} onOpenLikes={() => {}} />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/client-dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
            Loading conversations…
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground text-sm">
            <p>No conversations yet.</p>
            <p className="text-xs">Start a conversation from a tradesperson&apos;s profile.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-200px)] min-h-[500px]">
            <div className="rounded-xl border border-border bg-card overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConvoId(c.id)}
                  className={`w-full text-left p-4 border-b border-border hover:bg-muted/40 transition-colors ${
                    activeConvoId === c.id ? "bg-muted/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      {c.otherPartyImage && (
                        <AvatarImage src={c.otherPartyImage} alt={c.otherPartyName} />
                      )}
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                        {c.otherPartyName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{c.otherPartyName}</span>
                        {c.lastMsgAt && (
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">{relTime(c.lastMsgAt)}</span>
                        )}
                      </div>
                      {c.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{c.lastMessage.content}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card flex flex-col">
              {activeConvo ? (
                <>
                  <div className="p-4 border-b border-border flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {activeConvo.otherPartyImage && (
                        <AvatarImage src={activeConvo.otherPartyImage} alt={activeConvo.otherPartyName} />
                      )}
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                        {activeConvo.otherPartyName.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-semibold flex-1">{activeConvo.otherPartyName}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setActiveConvoId(null)}
                      title="Close chat"
                      className="shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    {msgLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Loading messages…</p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hello!</p>
                    ) : (
                      messages.map((m) => (
                        <Bubble key={m.id} who={m.isOwn ? "me" : "them"} time={m.createdAt}>
                          {m.content && <span>{m.content}</span>}
                          {m.fileUrl && (
                            <a
                              href={m.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block mt-1 underline text-xs opacity-80 truncate max-w-[200px]"
                            >
                              {m.fileUrl.split("/").pop() ?? "Attachment"}
                            </a>
                          )}
                        </Bubble>
                      ))
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {file && (
                    <div className="px-3 pt-2 border-t border-border">
                      <div className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1 w-fit">
                        <span className="truncate max-w-[160px]">{file.name}</span>
                        <button type="button" onClick={() => setFile(null)}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-3 border-t border-border flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] ?? null);
                        e.target.value = "";
                      }}
                    />
                    <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} title="Attach files">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message…"
                      className="flex-1"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    />
                    <Button size="icon" onClick={handleSend} disabled={sending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
