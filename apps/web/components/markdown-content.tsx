import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownContentProps {
  children: string
}

export function MarkdownContent({
  children,
}: MarkdownContentProps) {
  return (
    <div className="text-sm leading-6 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 text-3xl font-bold tracking-tight">
              {children}
            </h1>
          ),

          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 text-2xl font-semibold tracking-tight first:mt-0">
              {children}
            </h2>
          ),

          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-xl font-semibold first:mt-0">
              {children}
            </h3>
          ),

          h4: ({ children }) => (
            <h4 className="mb-2 mt-4 font-semibold">
              {children}
            </h4>
          ),

          p: ({ children }) => (
            <p className="mb-4 last:mb-0">
              {children}
            </p>
          ),

          ul: ({ children }) => (
            <ul className="mb-4 ml-5 list-disc space-y-1">
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol className="mb-4 ml-5 list-decimal space-y-1">
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li className="pl-1">
              {children}
            </li>
          ),

          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4"
            >
              {children}
            </a>
          ),

          strong: ({ children }) => (
            <strong className="font-semibold">
              {children}
            </strong>
          ),

          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-1 font-mono text-[0.9em]">
              {children}
            </code>
          ),

          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-lg bg-muted px-2 py-2.5 font-mono text-sm">
              {children}
            </pre>
          ),

          hr: () => (
            <hr className="my-6 border-border" />
          ),

          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {children}
              </table>
            </div>
          ),

          th: ({ children }) => (
            <th className="border px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),

          td: ({ children }) => (
            <td className="border px-3 py-2">
              {children}
            </td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}