import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

export function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%] rounded-2xl bg-gray-50 px-4 py-2.5 text-base leading-relaxed">
        {content}
      </div>
    </div>
  )
}

export function AssistantMessage({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="prose prose-base max-w-none text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {streaming && <span className="animate-pulse">▋</span>}
    </div>
  )
}

export function ErrorMessage({ message, className }: { message: string; className?: string }) {
  return (
    <p className={cn('text-base text-destructive', className)}>
      Error: {message}
    </p>
  )
}
