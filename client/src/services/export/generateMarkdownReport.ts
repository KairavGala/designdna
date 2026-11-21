import type { DesignAnatomyBoardModel } from '../../types/anatomyBoard';
import { PROVENANCE_LABELS, type DesignSystem } from '../../types/designSystem';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  PATTERN_TYPE_LABELS,
  REGION_CATEGORY_SHORT_LABELS,
  type PatternRelationship,
  type VisualElement,
  type VisualRegion
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';

export interface MarkdownReportInput {
  image: UploadedImage;
  board: DesignAnatomyBoardModel;
  designSystem: DesignSystem | null;
  regions: readonly VisualRegion[];
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  aiModel: string | null;
}

function mdEscapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n+/g, ' ').trim();
}

/**
 * Generates a deterministic, human-readable Markdown Design Anatomy Report
 * reflecting actual M4–M10 findings with explicit provenance, confidence,
 * region/element references, and honest gaps for unanalysed sections.
 */
export function buildMarkdownAnatomyReport(input: MarkdownReportInput): string {
  const { image, board, designSystem, regions, elements, patterns, aiModel } = input;
  const lines: string[] = [];

  lines.push(`# DesignDNA — Design Anatomy Report`);
  lines.push('');
  lines.push(`> *See the complete visual DNA of any website in one place.*`);
  lines.push('');
  lines.push(`- **Source Screenshot**: \`${image.name}\``);
  lines.push(`- **Dimensions**: ${image.width} × ${image.height} px (${image.format})`);
  lines.push(
    `- **Analysis Completeness**: ${board.completeness.populatedSections} / ${board.completeness.totalSections} sections populated`
  );
  if (aiModel) {
    lines.push(`- **Visual Interpretation Model**: \`${aiModel}\``);
  }
  if (designSystem) {
    lines.push(
      `- **Normalised Tokens**: ${designSystem.metrics.totalTokens} total (${designSystem.metrics.measuredCount} Measured, ${designSystem.metrics.aiInferredCount} AI-Inferred, ${designSystem.metrics.derivedCount} Derived)`
    );
  }
  lines.push(
    `- **Scope & Honesty**: Measured values come directly from uploaded screenshot pixels. AI-inferred and derived classifications are based solely on visual screenshot analysis without live HTML, CSS, DOM, or webfont file inspection.`
  );
  lines.push('');

  // ── 01. Visual Identity ────────────────────────────────────────────────
  lines.push(`## 01. Visual Identity`);
  lines.push('');
  if (!board.identity.available) {
    lines.push(
      `_Visual identity synthesis is not available in this session (AI Visual Interpretation has not been run)._`
    );
    lines.push('');
  } else {
    if (board.identity.overallAesthetic) {
      lines.push(`**Overall Visual Aesthetic**: ${board.identity.overallAesthetic}`);
      lines.push('');
    }
    if (board.identity.visualPersonality) {
      lines.push(`- **Visual Personality**: ${board.identity.visualPersonality}`);
    }
    if (board.identity.interfaceType) {
      lines.push(`- **Interface Archetype**: ${board.identity.interfaceType}`);
    }
    if (board.identity.themeMode) {
      lines.push(`- **Theme Polarity**: ${board.identity.themeMode}`);
    }
    if (board.identity.overallConfidence) {
      lines.push(
        `- **Provenance / Confidence**: AI-Inferred · ${board.identity.overallConfidence} confidence`
      );
    }
    lines.push('');

    if (board.identity.styleClassifications.length > 0) {
      lines.push(`### Evidence-Backed Style Classification`);
      lines.push('');
      lines.push(`| Style | Rationale | Provenance | Confidence |`);
      lines.push(`| --- | --- | --- | --- |`);
      for (const tag of board.identity.styleClassifications) {
        lines.push(
          `| **${mdEscapeCell(tag.label)}** | ${mdEscapeCell(tag.rationale)} | ${PROVENANCE_LABELS[tag.provenance]} | ${tag.confidence} |`
        );
      }
      lines.push('');
    }

    if (board.identity.dominantCharacteristics.length > 0) {
      lines.push(`### Dominant Design Characteristics`);
      lines.push('');
      for (const item of board.identity.dominantCharacteristics) {
        lines.push(
          `- **${item.label}**: ${item.detail} _(${PROVENANCE_LABELS[item.provenance]} · ${item.confidence} confidence)_`
        );
      }
      lines.push('');
    }

    if (board.identity.recognisabilitySummary) {
      lines.push(`### What Makes This Interface Recognisable`);
      lines.push('');
      lines.push(board.identity.recognisabilitySummary);
      lines.push('');
    }
  }

  // ── 02. Colour Identity ────────────────────────────────────────────────
  lines.push(`## 02. Colour Identity`);
  lines.push('');
  if (!board.colour.available) {
    lines.push(`_Measured colour extraction has not been run yet._`);
    lines.push('');
  } else {
    if (board.colour.measuredSpectrum.length > 0) {
      lines.push(`### Measured Pixel Spectrum`);
      lines.push('');
      lines.push(`| Rank | HEX | Coverage | CSS Variable | Provenance |`);
      lines.push(`| --- | --- | --- | --- | --- |`);
      for (const sw of board.colour.measuredSpectrum) {
        lines.push(
          `| #${sw.measuredRank ?? '-'} | \`${sw.hex}\` | ${sw.coveragePercentage !== null ? `${sw.coveragePercentage.toFixed(1)}%` : '—'} | ${sw.cssVariable ? `\`${sw.cssVariable}\`` : '—'} | ${PROVENANCE_LABELS[sw.provenance]} |`
        );
      }
      lines.push('');
    }

    const allRoleSwatches = [
      ...board.colour.roleSwatches.dominant,
      ...board.colour.roleSwatches.accent,
      ...board.colour.roleSwatches.backgroundAndSurface,
      ...board.colour.roleSwatches.textAndBorder
    ];
    if (allRoleSwatches.length > 0) {
      lines.push(`### Semantic Colour Roles`);
      lines.push('');
      lines.push(`| Role | HEX | CSS Variable | Coverage | Provenance | Confidence |`);
      lines.push(`| --- | --- | --- | --- | --- | --- |`);
      for (const sw of allRoleSwatches) {
        lines.push(
          `| ${mdEscapeCell(sw.label)} | \`${sw.hex}\` | ${sw.cssVariable ? `\`${sw.cssVariable}\`` : '—'} | ${sw.coveragePercentage !== null ? `${sw.coveragePercentage.toFixed(1)}%` : '—'} | ${PROVENANCE_LABELS[sw.provenance]} | ${sw.confidence} |`
        );
      }
      lines.push('');
    }
  }

  // ── 03. Typography Identity ────────────────────────────────────────────
  lines.push(`## 03. Typography Identity`);
  lines.push('');
  if (!board.typography.available) {
    lines.push(`_Typography interpretation is not available in this session._`);
    lines.push('');
  } else {
    lines.push(
      `> **Methodological Disclosure**: Font classifications, sizes, weights, and line heights are visually inferred from rendered screenshot pixels. Webfont files and computed CSS stylesheets were not inspected.`
    );
    lines.push('');
    if (board.typography.headingFontStyle) {
      lines.push(`- **Heading Font Style**: ${board.typography.headingFontStyle}`);
    }
    if (board.typography.bodyFontStyle) {
      lines.push(`- **Body Font Style**: ${board.typography.bodyFontStyle}`);
    }
    lines.push(
      `- **Monospace Detected**: ${board.typography.monospaceDetected ? 'Yes' : 'Not prominently detected'}`
    );
    if (board.typography.scaleSummary) {
      lines.push(`- **Scale Summary**: ${board.typography.scaleSummary}`);
    }
    if (board.typography.confidence) {
      lines.push(`- **Provenance / Confidence**: AI-Inferred · ${board.typography.confidence}`);
    }
    lines.push('');

    if (board.typography.specimens.length > 0) {
      lines.push(`### Typography Scale Hierarchy`);
      lines.push('');
      lines.push(`| Level | Size | Weight | Line Height | Usage | CSS Variable | Confidence |`);
      lines.push(`| --- | --- | --- | --- | --- | --- | --- |`);
      for (const spec of board.typography.specimens) {
        lines.push(
          `| ${mdEscapeCell(spec.level)} | \`${mdEscapeCell(spec.estimatedSize)}\` | ${mdEscapeCell(spec.estimatedWeight)} | ${mdEscapeCell(spec.lineHeight)} | ${mdEscapeCell(spec.usage)} | ${spec.cssVariable ? `\`${spec.cssVariable}\`` : '—'} | ${spec.confidence} |`
        );
      }
      lines.push('');
    }
  }

  // ── 04. Patterns & Motifs ──────────────────────────────────────────────
  lines.push(`## 04. Patterns & Motifs`);
  lines.push('');
  if (!board.patterns.available) {
    lines.push(`_No recurring patterns, geometric motifs, or decorative surface details were verified._`);
    lines.push('');
  } else {
    if (patterns.length > 0) {
      lines.push(`### Verified Recurring Relationships (${patterns.length})`);
      lines.push('');
      for (const pat of patterns) {
        lines.push(
          `- **${pat.name}** (${PATTERN_TYPE_LABELS[pat.patternType]} · ${pat.occurrenceCount}× verified · AI-Inferred · ${pat.confidence} confidence)`
        );
        lines.push(`  - ${pat.description}`);
        if (pat.evidence.length > 0) {
          lines.push(`  - _Evidence_: ${pat.evidence.join('; ')}`);
        }
      }
      lines.push('');
    }

    const patternElements = [
      ...board.patterns.motifs,
      ...board.patterns.textures,
      ...board.patterns.icons,
      ...board.patterns.decorative
    ];
    if (patternElements.length > 0) {
      lines.push(`### Detected Visual Elements (${patternElements.length})`);
      lines.push('');
      lines.push(`| Name | Category | Repetition | Source Region | Location (x, y, w×h) | Confidence |`);
      lines.push(`| --- | --- | --- | --- | --- | --- |`);
      for (const el of patternElements) {
        const box = el.boundingBox;
        const loc = `${Math.round(box.x * 100)}%, ${Math.round(box.y * 100)}% (${Math.round(box.width * 100)}%×${Math.round(box.height * 100)}%)`;
        lines.push(
          `| ${mdEscapeCell(el.name)} | ${ELEMENT_CATEGORY_SHORT_LABELS[el.category]} | ${el.repetitionStatus === 'recurring' ? `${el.occurrenceCount}× recurring` : 'Individual'} | ${mdEscapeCell(el.parentRegionName ?? 'Full capture')} | \`${loc}\` | ${el.confidence} |`
        );
      }
      lines.push('');
    }
  }

  // ── 05. Components & Shapes ────────────────────────────────────────────
  lines.push(`## 05. Components & Shapes`);
  lines.push('');
  if (!board.components.available) {
    lines.push(`_No component specimens or shape tokens are available in this session._`);
    lines.push('');
  } else {
    if (board.components.croppedComponents.length > 0) {
      lines.push(`### Localized Component Specimens (${board.components.croppedComponents.length})`);
      lines.push('');
      for (const comp of board.components.croppedComponents) {
        lines.push(
          `- **${comp.name}** (${comp.subcategory} · ${comp.parentRegionName ?? 'Full capture'} · AI-Inferred · ${comp.confidence} confidence): ${comp.description}`
        );
      }
      lines.push('');
    }

    if (board.components.inferredComponents.length > 0) {
      lines.push(`### Observed Interface Component Styles`);
      lines.push('');
      lines.push(`| Component | Category | Visual Treatment | Border Radius | Confidence |`);
      lines.push(`| --- | --- | --- | --- | --- |`);
      for (const comp of board.components.inferredComponents) {
        lines.push(
          `| ${mdEscapeCell(comp.name)} | ${mdEscapeCell(comp.category)} | ${mdEscapeCell(comp.visualTreatment)} | \`${mdEscapeCell(comp.borderRadius)}\` | ${comp.confidence} |`
        );
      }
      lines.push('');
    }

    if (board.components.borderRadii.length > 0) {
      lines.push(`### Corner Radius Scale`);
      lines.push('');
      for (const r of board.components.borderRadii) {
        lines.push(`- **${r.label}**: \`${r.value}\` — ${r.usage}`);
      }
      lines.push('');
    }
  }

  // ── 06. Layout & Composition ───────────────────────────────────────────
  lines.push(`## 06. Layout & Composition`);
  lines.push('');
  if (!board.layout.available) {
    lines.push(`_Layout and spatial composition analysis is not available in this session._`);
    lines.push('');
  } else {
    if (board.layout.structureType) {
      lines.push(`- **Page Structure**: ${board.layout.structureType}`);
    }
    if (board.layout.gridColumns) {
      lines.push(`- **Grid Columns**: ${board.layout.gridColumns}`);
    }
    if (board.layout.alignment) {
      lines.push(`- **Alignment**: ${board.layout.alignment}`);
    }
    if (board.layout.contentWidth) {
      lines.push(`- **Content Width**: ${board.layout.contentWidth}`);
    }
    if (board.layout.spacing) {
      lines.push(
        `- **Spacing Rhythm**: ${board.layout.spacing.baseUnit} base unit · ${board.layout.spacing.density} density · container padding ${board.layout.spacing.containerPadding}`
      );
      lines.push(`- **Section Rhythm**: ${board.layout.spacing.sectionRhythm}`);
    }
    lines.push('');

    if (regions.length > 0) {
      lines.push(`### Verified Screenshot Regions (${regions.length})`);
      lines.push('');
      lines.push(`| # | Region | Category | Proportional Bounds | Confidence |`);
      lines.push(`| --- | --- | --- | --- | --- |`);
      regions.forEach((reg, idx) => {
        const b = reg.boundingBox;
        lines.push(
          `| ${String(idx + 1).padStart(2, '0')} | ${mdEscapeCell(reg.name)} | ${REGION_CATEGORY_SHORT_LABELS[reg.category]} | \`x:${Math.round(b.x * 100)}% y:${Math.round(b.y * 100)}% w:${Math.round(b.width * 100)}% h:${Math.round(b.height * 100)}%\` | ${reg.confidence} |`
        );
      });
      lines.push('');
    }
  }

  // ── 07. Effects & Surface Language ─────────────────────────────────────
  lines.push(`## 07. Effects & Surface Language`);
  lines.push('');
  if (!board.effects.available) {
    lines.push(`_Surface and visual effects analysis is not available in this session._`);
    lines.push('');
  } else {
    if (board.effects.elevationStyle) {
      lines.push(`- **Elevation Style**: ${board.effects.elevationStyle}`);
    }
    if (board.effects.borderStyle) {
      lines.push(`- **Border Language**: ${board.effects.borderStyle}`);
    }
    if (board.effects.shadowStyle) {
      lines.push(`- **Shadows & Transparency**: ${board.effects.shadowStyle}`);
    }
    if (board.effects.notes) {
      lines.push(`- **Notes**: ${board.effects.notes}`);
    }
    if (board.effects.confidence) {
      lines.push(`- **Provenance / Confidence**: AI-Inferred · ${board.effects.confidence}`);
    }
    lines.push('');

    const surfaceSpecimens = [...board.effects.surfaceElements, ...board.effects.decorativeElements];
    if (surfaceSpecimens.length > 0) {
      lines.push(`### Observed Surface & Texture Details`);
      lines.push('');
      for (const el of surfaceSpecimens) {
        const basis =
          el.surfaceBasis === 'directly-visible-surface'
            ? 'Directly visible surface'
            : 'Inferred visual effect';
        lines.push(
          `- **${el.name}** (${basis} · ${el.confidence} confidence): ${el.characteristics.surfaceAndColor}`
        );
      }
      lines.push('');
    }
  }

  // ── Reconciliation Notes (M6) ──────────────────────────────────────────
  if (designSystem && designSystem.reconciliationNotes.length > 0) {
    lines.push(`## Token Reconciliation Notes`);
    lines.push('');
    for (const note of designSystem.reconciliationNotes) {
      lines.push(`- **${note.tokenName}** (\`${note.kind}\`): ${note.explanation}`);
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`*Generated locally in-browser by DesignDNA (M11 Developer Tools & Export Suite). Total visual elements referenced: ${elements.length}.*`);
  lines.push('');

  return lines.join('\n');
}
