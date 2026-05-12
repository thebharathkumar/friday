"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="nox-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer noopener" className="text-nox-accent underline decoration-nox-line underline-offset-2" />,
          code: ({ className, children, ...rest }) => {
            const inline = !className;
            if (inline) {
              return (
                <code className="px-1 py-0.5 rounded bg-nox-panel border border-nox-line text-[0.9em] text-nox-accent font-mono" {...rest}>
                  {children}
                </code>
              );
            }
            return <code className={className} {...rest}>{children}</code>;
          },
          pre: (props) => (
            <pre
              {...props}
              className="my-3 rounded border border-nox-line bg-nox-panel/80 p-3 overflow-x-auto text-[0.85em] leading-relaxed"
            />
          ),
          p: (props) => <p {...props} className="my-2 leading-relaxed" />,
          ul: (props) => <ul {...props} className="my-2 ml-5 list-disc space-y-1" />,
          ol: (props) => <ol {...props} className="my-2 ml-5 list-decimal space-y-1" />,
          h1: (props) => <h1 {...props} className="mt-4 mb-2 text-base font-semibold text-nox-accent uppercase tracking-wider" />,
          h2: (props) => <h2 {...props} className="mt-4 mb-2 text-sm font-semibold text-nox-accent uppercase tracking-wider" />,
          h3: (props) => <h3 {...props} className="mt-3 mb-1 text-sm font-semibold text-nox-ink" />,
          strong: (props) => <strong {...props} className="text-nox-ink font-semibold" />,
          em: (props) => <em {...props} className="text-nox-dim italic" />,
          blockquote: (props) => (
            <blockquote {...props} className="my-2 border-l-2 border-nox-accent pl-3 text-nox-dim" />
          ),
          table: (props) => <table {...props} className="my-2 border-collapse text-xs" />,
          th: (props) => <th {...props} className="border border-nox-line px-2 py-1 text-left text-nox-dim" />,
          td: (props) => <td {...props} className="border border-nox-line px-2 py-1" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
