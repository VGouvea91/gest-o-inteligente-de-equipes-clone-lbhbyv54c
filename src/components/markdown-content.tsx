import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

// Renderiza o conteúdo das respostas do Gestor-IA como markdown (GFM).
// Usa o plugin @tailwindcss/typography (`prose`) para tipografia + estilos
// inline para tabelas/código que o prose não cobre por padrão no dark mode.
export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-sm max-w-none dark:prose-invert',
        // Tabelas: bordas visíveis em ambos os temas
        'prose-th:border prose-th:border-border prose-td:border prose-td:border-border',
        'prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1',
        // Listas: menos margem para caber melhor no balão do chat
        'prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
        // Parágrafos e headings: espaçamento compacto
        'prose-p:my-1 prose-headings:my-2',
        // Links: cor primária
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        // Código inline
        'prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
