import { useCallback, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/core'
// Register only common languages to keep bundle small:
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
// Also register aliases:
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('shell', bash)

interface CodeBlockProps {
  children: string
  language?: string
}

export default function CodeBlock({ children, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  const highlighted = language
    ? hljs.highlight(children, { language, ignoreIllegals: true })
    : hljs.highlightAuto(children)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 12px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        fontSize: 12,
        color: 'var(--text-tertiary)',
      }}>
        <span>{language || highlighted.language || 'text'}</span>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? 'var(--success)' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 8px',
          }}
        >
          {copied ? '\u2713 Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{
        background: 'rgba(0,0,0,0.3)',
        padding: 'var(--space-3)',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        overflowX: 'auto',
        margin: 0,
      }}>
        <code
          ref={codeRef}
          className={`hljs language-${language || ''}`}
          dangerouslySetInnerHTML={{ __html: highlighted.value }}
        />
      </pre>
    </div>
  )
}
