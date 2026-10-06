import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { streamAgentChat, type DisplayMessage, displayableMessages } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import { MarkdownContent } from '@/components/markdown-content'

export default function Chat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortController = useRef<AbortController | null>(null)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await pb.send('/backend/v1/chats', { method: 'GET', query: { limit: 1 } })
        if (res.items?.length > 0) {
          const recentConv = res.items[0].id
          setConvId(recentConv)
          const msgRes = await pb.send(`/backend/v1/chats/${recentConv}/messages`, {
            method: 'GET',
          })
          setMessages(displayableMessages(msgRes.messages || []).reverse())
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadHistory()
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const userMsg = input.trim()
    setInput('')
    setIsLoading(true)

    const tempId = Date.now().toString()
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', content: userMsg, created: new Date().toISOString() },
    ])

    abortController.current = new AbortController()

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/ask-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
        body: JSON.stringify({ message: userMsg, conversation_id: convId }),
        signal: abortController.current.signal,
      })

      const tempAssisId = (Date.now() + 1).toString()
      setMessages((prev) => [
        ...prev,
        { id: tempAssisId, role: 'assistant', content: '', created: new Date().toISOString() },
      ])

      const result = await streamAgentChat(res, {
        onChunk: (_, full) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempAssisId ? { ...m, content: full } : m)),
          )
        },
        signal: abortController.current.signal,
      })

      setConvId(result.conversation_id)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssisId ? { ...m, id: result.message_id, content: result.content } : m,
        ),
      )
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro de conexão com a IA.',
            created: new Date().toISOString(),
          },
        ])
      }
    } finally {
      setIsLoading(false)
      abortController.current = null
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto p-4 md:p-6 animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" /> Gestor-IA
        </h1>
        <p className="text-muted-foreground text-sm">
          Seu assistente especialista em liderança e produtividade.
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border shadow-sm">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 dark:bg-background/50"
        >
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <p className="max-w-md">
                Olá! Sou o Gestor-IA. Posso ajudar a equilibrar a carga da equipe, redigir feedbacks
                ou sugerir prioridades. Como posso ajudar hoje?
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-4 max-w-[85%]',
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : '',
              )}
            >
              <Avatar
                className={cn(
                  'h-8 w-8 shrink-0',
                  msg.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {msg.role === 'assistant' ? (
                  <Bot className="h-5 w-5 m-auto" />
                ) : (
                  <User className="h-5 w-5 m-auto" />
                )}
              </Avatar>
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm shadow-sm',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border',
                )}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownContent content={msg.content} />
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-4 max-w-[85%]">
              <Avatar className="h-8 w-8 shrink-0 bg-primary text-primary-foreground">
                <Bot className="h-5 w-5 m-auto" />
              </Avatar>
              <div className="rounded-2xl px-4 py-3 bg-card border flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-background border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Pergunte sobre a equipe, tarefas atrasadas ou peça dicas de feedback..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-full bg-slate-100/50 dark:bg-slate-900 border-0 focus-visible:ring-1 focus-visible:ring-primary"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="rounded-full shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
