"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownProps = {
  content: string;
};

export function Markdown({ content }: MarkdownProps) {
  return (
    <article className="prose dark:prose-invert min-w-0 max-w-none wrap-break-word">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="my-6 w-full max-w-full overflow-x-auto">
              <table className="w-max min-w-full">{children}</table>
            </div>
          ),

          pre: ({ children }) => (
            <pre className="max-w-full overflow-x-auto">{children}</pre>
          ),

          code: ({ children, className }) => (
            <code className={`${className ?? ""} wrap-break-word`}>
              {children}
            </code>
          ),

          a: ({ children, href }) => (
            <a href={href} className="wrap-anywhere">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
