import {
  TOKEN_CATEGORY_LABELS,
  TOKEN_CATEGORY_ORDER,
  type DesignSystemSourceInfo,
  type DesignToken,
  type DesignTokenJsonLeaf,
  type DesignTokensJsonDocument,
  type TokenCategory
} from '../../types/designSystem';

function sanitizeCssComment(text: string): string {
  return text.replace(/\*\//g, '* /').replace(/\r?\n/g, ' ').trim();
}

function sanitizeCssValue(value: string): string {
  // Prevent stray semicolons or braces from breaking CSS syntax
  return value.replace(/[;{}]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Generates deterministic, valid CSS custom properties (:root { ... })
 * grouped by token category with provenance and confidence comments.
 */
export function generateCssVariables(
  byCategory: Record<TokenCategory, DesignToken[]>,
  source: DesignSystemSourceInfo
): string {
  const lines: string[] = [
    `/* DesignDNA Normalized Design Tokens (v1.0.0) */`,
    `/* Source: ${sanitizeCssComment(source.fileName)} (${source.width}x${source.height}px) */`,
    `:root {`
  ];

  let sectionCount = 0;

  for (const category of TOKEN_CATEGORY_ORDER) {
    const tokens = byCategory[category];
    if (!tokens || tokens.length === 0) continue;

    if (sectionCount > 0) {
      lines.push('');
    }
    sectionCount += 1;

    lines.push(`  /* ${TOKEN_CATEGORY_LABELS[category]} */`);
    for (const token of tokens) {
      const safeValue = sanitizeCssValue(token.value);
      lines.push(
        `  ${token.cssVariable}: ${safeValue}; /* ${token.provenance} | ${token.confidence} */`
      );
    }
  }

  lines.push(`}`);
  return `${lines.join('\n')}\n`;
}

/**
 * Generates a deterministic, structured W3C-inspired JSON design token document
 * preserving provenance, confidence, supporting evidence, and reconciliation metadata.
 */
export function generateJsonTokens(
  byCategory: Record<TokenCategory, DesignToken[]>,
  source: DesignSystemSourceInfo
): DesignTokensJsonDocument {
  const grouped: Record<TokenCategory, Record<string, DesignTokenJsonLeaf>> = {
    color: {},
    typography: {},
    spacing: {},
    radius: {},
    border: {},
    shadow: {},
    layout: {}
  };

  let totalTokens = 0;

  for (const category of TOKEN_CATEGORY_ORDER) {
    const tokens = byCategory[category];
    for (const token of tokens) {
      totalTokens += 1;
      grouped[category][token.name] = {
        $value: token.value,
        $type: token.cssType,
        $description: token.description,
        $extensions: {
          designdna: {
            id: token.id,
            cssVariable: token.cssVariable,
            provenance: token.provenance,
            confidence: token.confidence,
            evidence: {
              ...token.evidence,
              notes: [...token.evidence.notes]
            },
            ...(token.reconciliation
              ? { reconciliation: { ...token.reconciliation } }
              : {})
          }
        }
      };
    }
  }

  return {
    $schema: 'https://tr.designtokens.org/format/',
    $metadata: {
      generator: 'DesignDNA',
      schemaVersion: '1.0.0',
      sourceFile: source.fileName,
      dimensions: {
        width: source.width,
        height: source.height
      },
      aiModel: source.aiModel,
      tokenCount: totalTokens
    },
    tokens: grouped
  };
}
