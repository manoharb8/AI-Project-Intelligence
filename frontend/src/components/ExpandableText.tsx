import {useState, type ReactNode} from 'react';

/** Presentation only: preserve the complete original text behind an explicit control. */
export function ExpandableText({text, limit = 180}: {text: string; limit?: number}) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > limit;
  const cut = text.lastIndexOf(' ', limit);
  return <div className="compact-text"><p>{expanded || !long ? text : text.slice(0, cut > limit / 2 ? cut : limit) + '…'}</p>{long && <button type="button" className="compact-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show less' : 'Read full text'}</button>}</div>;
}

export function PreviewList({children, count = 3}: {children: ReactNode[]; count?: number}) {
  return <>{children.slice(0, count)}{children.length > count && <details className="compact-more"><summary>Show {children.length - count} more entries</summary>{children.slice(count)}</details>}</>;
}
