import { jsPDF } from 'jspdf';
import type { DesignAnatomyBoardModel } from '../../types/anatomyBoard';
import { PROVENANCE_LABELS, type DesignSystem } from '../../types/designSystem';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  PATTERN_TYPE_LABELS,
  REGION_CATEGORY_SHORT_LABELS,
  type ElementVisualAssets,
  type PatternRelationship,
  type VisualElement,
  type VisualRegion
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';

export interface PdfReportInput {
  image: UploadedImage;
  board: DesignAnatomyBoardModel;
  designSystem: DesignSystem | null;
  regions: readonly VisualRegion[];
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  elementAssets: Record<string, ElementVisualAssets>;
  aiModel: string | null;
}

// DesignDNA obsidian & turquoise palette (RGB tuples)
const COLORS = {
  bg: [7, 11, 13] as const,
  surface: [14, 23, 26] as const,
  elevated: [19, 31, 35] as const,
  border: [28, 45, 51] as const,
  accent: [22, 214, 197] as const,
  ink: [240, 246, 247] as const,
  muted: [145, 162, 165] as const,
  faint: [97, 116, 121] as const,
  measured: [52, 211, 153] as const,
  amber: [251, 191, 36] as const
};

/**
 * Normalizes Unicode symbols not present in built-in PDF Helvetica encoding
 * into crisp Latin/ASCII equivalents so text renders cleanly without glyph corruption.
 */
function pdfText(raw: string): string {
  return raw
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, ' - ')
    .replace(/\u2026/g, '...')
    .replace(/\u00D7/g, 'x')
    .replace(/\u00B7/g, ' | ')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2192/g, '->')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseHexToRgb(hex: string): [number, number, number] {
  const m = hex.trim().match(/^#([0-9A-Fa-f]{6})$/);
  if (!m) return [22, 214, 197];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Generates a multi-page DesignDNA Design Anatomy Report PDF in-browser using jsPDF,
 * styled in DesignDNA's obsidian & turquoise identity with real colour swatches and
 * embedded real M9 PNG screenshot crops (never fabricated screenshots or findings).
 */
export function buildPdfAnatomyReport(input: PdfReportInput): Blob {
  const { image, board, designSystem, regions, elements, patterns, elementAssets, aiModel } = input;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 48;

  let y = 42;

  const paintPageBackground = () => {
    doc.setFillColor(...COLORS.bg);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    // Subtle top hairline accent
    doc.setFillColor(...COLORS.accent);
    doc.rect(0, 0, pageWidth, 2.5, 'F');
  };

  const addNewPage = () => {
    doc.addPage();
    paintPageBackground();
    y = 44;
  };

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > bottomLimit) {
      addNewPage();
    }
  };

  const drawSectionHeading = (index: string, title: string, provenanceNote: string) => {
    ensureSpace(46);
    y += 6;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.75);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.accent);
    doc.text(`${index}.`, marginX, y);

    doc.setFontSize(13);
    doc.setTextColor(...COLORS.ink);
    doc.text(pdfText(title), marginX + 20, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    const note = pdfText(provenanceNote);
    const noteWidth = doc.getTextWidth(note);
    doc.text(note, pageWidth - marginX - noteWidth, y);

    y += 16;
  };

  const drawWrappedParagraph = (
    text: string,
    opts?: {
      fontSize?: number;
      bold?: boolean;
      color?: readonly [number, number, number];
      indent?: number;
      gapAfter?: number;
    }
  ) => {
    const fontSize = opts?.fontSize ?? 9.5;
    const indent = opts?.indent ?? 0;
    const color = opts?.color ?? COLORS.muted;
    const lineHeight = fontSize * 1.45;
    const lines = doc.splitTextToSize(pdfText(text), contentWidth - indent) as string[];

    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);

    for (const line of lines) {
      ensureSpace(lineHeight + 4);
      doc.text(line, marginX + indent, y);
      y += lineHeight;
    }
    y += opts?.gapAfter ?? 5;
  };

  const drawKeyValueRow = (label: string, value: string) => {
    const labelStr = `${pdfText(label)}: `;
    const valStr = pdfText(value);
    const lines = doc.splitTextToSize(`${labelStr}${valStr}`, contentWidth) as string[];
    const lineHeight = 13.5;

    ensureSpace(lines.length * lineHeight + 4);
    lines.forEach((line, idx) => {
      if (idx === 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.2);
        doc.setTextColor(...COLORS.ink);
        doc.text(labelStr, marginX, y);
        const offset = doc.getTextWidth(labelStr);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.muted);
        doc.text(line.slice(labelStr.length), marginX + offset, y);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.2);
        doc.setTextColor(...COLORS.muted);
        doc.text(line, marginX, y);
      }
      y += lineHeight;
    });
    y += 2;
  };

  // Paint initial page
  paintPageBackground();

  // ── Masthead Card ──────────────────────────────────────────────────────
  const headerCardHeight = 112;
  doc.setFillColor(...COLORS.surface);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.8);
  doc.roundedRect(marginX, y, contentWidth, headerCardHeight, 8, 8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.accent);
  doc.text('DESIGNDNA  |  DESIGN ANATOMY REPORT', marginX + 16, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...COLORS.ink);
  doc.text('Complete Visual DNA Dossier', marginX + 16, y + 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    pdfText(`Source capture: ${image.name} (${image.width}x${image.height}px, ${image.format})`),
    marginX + 16,
    y + 66
  );

  const metaParts = [
    `${board.completeness.populatedSections}/${board.completeness.totalSections} sections populated`,
    `${board.colour.totalMeasuredColors} measured colours`,
    `${regions.length} regions`,
    `${elements.length} visual elements`
  ];
  if (designSystem) metaParts.push(`${designSystem.metrics.totalTokens} tokens`);
  if (aiModel) metaParts.push(aiModel);

  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.accent);
  doc.text(pdfText(metaParts.join('  |  ')), marginX + 16, y + 84);

  doc.setFontSize(7.8);
  doc.setTextColor(...COLORS.faint);
  doc.text(
    'Generated locally in-browser. Measured values come from screenshot pixels; inferred items have no DOM/HTML/CSS access.',
    marginX + 16,
    y + 100
  );

  y += headerCardHeight + 18;

  // ── 01. Visual Identity ────────────────────────────────────────────────
  drawSectionHeading(
    '01',
    'Visual Identity',
    board.identity.available
      ? `AI-Inferred | ${board.identity.overallConfidence ?? 'medium'} confidence`
      : 'Not yet analysed'
  );

  if (!board.identity.available) {
    drawWrappedParagraph(
      'Visual identity synthesis is unavailable because AI Visual Interpretation has not been run in this session.',
      { color: COLORS.faint }
    );
  } else {
    if (board.identity.overallAesthetic) {
      drawWrappedParagraph(board.identity.overallAesthetic, {
        fontSize: 10.5,
        bold: true,
        color: COLORS.ink,
        gapAfter: 6
      });
    }
    if (board.identity.visualPersonality) {
      drawKeyValueRow('Visual Personality', board.identity.visualPersonality);
    }
    if (board.identity.interfaceType || board.identity.themeMode) {
      drawKeyValueRow(
        'Interface & Theme',
        `${board.identity.interfaceType ?? 'Web Interface'} | ${board.identity.themeMode ?? 'unspecified'} mode`
      );
    }
    if (board.identity.styleClassifications.length > 0) {
      drawKeyValueRow(
        'Style Classification',
        board.identity.styleClassifications
          .map((t) => `${t.label} (${t.confidence})`)
          .join(', ')
      );
      for (const tag of board.identity.styleClassifications) {
        drawWrappedParagraph(`- ${tag.label}: ${tag.rationale}`, {
          fontSize: 8.6,
          indent: 10,
          gapAfter: 2
        });
      }
      y += 3;
    }
    if (board.identity.recognisabilitySummary) {
      drawKeyValueRow('Recognisability', board.identity.recognisabilitySummary);
    }
  }

  // ── 02. Colour Identity ────────────────────────────────────────────────
  drawSectionHeading(
    '02',
    'Colour Identity',
    board.colour.hasSemanticRoles ? 'Measured + AI-Inferred' : 'Measured Pixels'
  );

  if (!board.colour.available) {
    drawWrappedParagraph('No colour palette has been extracted yet.', { color: COLORS.faint });
  } else {
    // Draw proportional measured colour spectrum bar
    if (board.colour.measuredSpectrum.length > 0) {
      ensureSpace(34);
      const totalWeight = board.colour.measuredSpectrum.reduce(
        (acc, sw) => acc + Math.max(sw.coveragePercentage ?? 2, 3),
        0
      );
      let cursorX = marginX;
      for (const sw of board.colour.measuredSpectrum) {
        const w = (Math.max(sw.coveragePercentage ?? 2, 3) / totalWeight) * contentWidth;
        const [r, g, b] = parseHexToRgb(sw.hex);
        doc.setFillColor(r, g, b);
        doc.rect(cursorX, y, Math.max(1, w), 14, 'F');
        cursorX += w;
      }
      doc.setDrawColor(...COLORS.border);
      doc.rect(marginX, y, contentWidth, 14, 'S');
      y += 22;
    }

    const swatchesToShow = [
      ...board.colour.roleSwatches.dominant,
      ...board.colour.roleSwatches.accent,
      ...board.colour.roleSwatches.backgroundAndSurface,
      ...board.colour.roleSwatches.textAndBorder
    ];
    const finalSwatches =
      swatchesToShow.length > 0 ? swatchesToShow : board.colour.measuredSpectrum;

    const cols = 3;
    const colGap = 10;
    const cardW = (contentWidth - colGap * (cols - 1)) / cols;
    const cardH = 44;

    for (let i = 0; i < finalSwatches.length; i += cols) {
      ensureSpace(cardH + 8);
      const row = finalSwatches.slice(i, i + cols);
      row.forEach((sw, colIdx) => {
        const x = marginX + colIdx * (cardW + colGap);
        doc.setFillColor(...COLORS.surface);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(x, y, cardW, cardH, 5, 5, 'FD');

        const [r, g, b] = parseHexToRgb(sw.hex);
        doc.setFillColor(r, g, b);
        doc.setDrawColor(...COLORS.border);
        doc.roundedRect(x + 8, y + 8, 22, 28, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...COLORS.ink);
        doc.text(pdfText(sw.label).slice(0, 22), x + 36, y + 17);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.accent);
        const pct = sw.coveragePercentage !== null ? ` (${sw.coveragePercentage.toFixed(1)}%)` : '';
        doc.text(`${sw.hex}${pct}`, x + 36, y + 28);

        doc.setFontSize(7.2);
        doc.setTextColor(...COLORS.faint);
        doc.text(
          pdfText(`${PROVENANCE_LABELS[sw.provenance]} | ${sw.confidence}`),
          x + 36,
          y + 38
        );
      });
      y += cardH + 8;
    }
  }

  // ── 03. Typography Identity ────────────────────────────────────────────
  drawSectionHeading(
    '03',
    'Typography Identity',
    board.typography.available
      ? `AI-Inferred | ${board.typography.confidence ?? 'medium'} confidence`
      : 'Not yet analysed'
  );

  if (!board.typography.available) {
    drawWrappedParagraph('Typography interpretation is not yet available.', { color: COLORS.faint });
  } else {
    if (board.typography.headingFontStyle) {
      drawKeyValueRow('Heading Style', board.typography.headingFontStyle);
    }
    if (board.typography.bodyFontStyle) {
      drawKeyValueRow('Body Style', board.typography.bodyFontStyle);
    }
    if (board.typography.scaleSummary) {
      drawKeyValueRow('Scale Summary', board.typography.scaleSummary);
    }
    for (const spec of board.typography.specimens) {
      drawWrappedParagraph(
        `- ${spec.level}: ${spec.estimatedSize} / ${spec.estimatedWeight} / LH ${spec.lineHeight} -- ${spec.usage}${spec.cssVariable ? ` (${spec.cssVariable})` : ''}`,
        { fontSize: 8.6, indent: 8, gapAfter: 2 }
      );
    }
    drawWrappedParagraph(
      'Note: Font classifications and metrics are visually inferred from screenshot pixels; webfont files were not verified.',
      { fontSize: 7.8, color: COLORS.faint, gapAfter: 6 }
    );
  }

  // ── 04. Patterns & Motifs (with real embedded PNG crops) ───────────────
  drawSectionHeading(
    '04',
    'Patterns & Motifs',
    board.patterns.available ? 'Screenshot Crops + AI-Inferred' : 'None verified'
  );

  if (!board.patterns.available) {
    drawWrappedParagraph('No geometric motifs, background textures, or recurring patterns were verified.', {
      color: COLORS.faint
    });
  } else {
    if (patterns.length > 0) {
      for (const pat of patterns) {
        drawKeyValueRow(
          `${pat.name} (${PATTERN_TYPE_LABELS[pat.patternType]}, ${pat.occurrenceCount}x)`,
          `${pat.description} [${pat.confidence} confidence]`
        );
      }
      y += 4;
    }

    const patternEls = [
      ...board.patterns.motifs,
      ...board.patterns.textures,
      ...board.patterns.icons,
      ...board.patterns.decorative
    ];
    for (const el of patternEls.slice(0, 8)) {
      const cropUrl = elementAssets[el.id]?.primaryCropUrl ?? null;
      const rowHeight = cropUrl ? 56 : 36;
      ensureSpace(rowHeight + 8);

      doc.setFillColor(...COLORS.surface);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(marginX, y, contentWidth, rowHeight, 5, 5, 'FD');

      let textX = marginX + 10;
      if (cropUrl && cropUrl.startsWith('data:image/png;base64,')) {
        try {
          doc.addImage(cropUrl, 'PNG', marginX + 8, y + 6, 56, 44, undefined, 'FAST');
          textX = marginX + 74;
        } catch {
          // If a crop cannot be embedded, keep clean text fallback without failing PDF generation
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.ink);
      doc.text(pdfText(el.name), textX, y + 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(...COLORS.accent);
      doc.text(
        pdfText(
          `${ELEMENT_CATEGORY_SHORT_LABELS[el.category]} | ${el.parentRegionName ?? 'Full capture'} | ${el.confidence} confidence`
        ),
        textX,
        y + 29
      );

      doc.setFontSize(8.2);
      doc.setTextColor(...COLORS.muted);
      const descLines = doc.splitTextToSize(
        pdfText(el.description),
        pageWidth - marginX - textX - 10
      ) as string[];
      doc.text(descLines.slice(0, 2), textX, y + 41);

      y += rowHeight + 8;
    }
  }

  // ── 05. Components & Shapes ────────────────────────────────────────────
  drawSectionHeading(
    '05',
    'Components & Shapes',
    board.components.available ? 'M9 Crops + M5/M6 Analysis' : 'Not yet analysed'
  );

  if (!board.components.available) {
    drawWrappedParagraph('No component specimens or corner radius tokens available.', {
      color: COLORS.faint
    });
  } else {
    for (const comp of board.components.croppedComponents.slice(0, 6)) {
      const cropUrl = elementAssets[comp.id]?.primaryCropUrl ?? null;
      const rowHeight = cropUrl ? 52 : 34;
      ensureSpace(rowHeight + 6);

      doc.setFillColor(...COLORS.surface);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(marginX, y, contentWidth, rowHeight, 5, 5, 'FD');

      let textX = marginX + 10;
      if (cropUrl && cropUrl.startsWith('data:image/png;base64,')) {
        try {
          doc.addImage(cropUrl, 'PNG', marginX + 8, y + 6, 52, 40, undefined, 'FAST');
          textX = marginX + 70;
        } catch {
          // Graceful text-only fallback
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.ink);
      doc.text(pdfText(`${comp.name} (${comp.subcategory})`), textX, y + 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(...COLORS.muted);
      const descLines = doc.splitTextToSize(
        pdfText(comp.description),
        pageWidth - marginX - textX - 10
      ) as string[];
      doc.text(descLines.slice(0, 2), textX, y + 30);

      y += rowHeight + 6;
    }

    for (const comp of board.components.inferredComponents) {
      drawWrappedParagraph(
        `- ${comp.name} [${comp.category}]: ${comp.visualTreatment} (Radius: ${comp.borderRadius} | ${comp.confidence})`,
        { fontSize: 8.6, indent: 8, gapAfter: 2 }
      );
    }

    if (board.components.borderRadii.length > 0) {
      drawKeyValueRow(
        'Corner Radius Scale',
        board.components.borderRadii.map((r) => `${r.label}: ${r.value}`).join(' | ')
      );
    }
  }

  // ── 06. Layout & Composition ───────────────────────────────────────────
  drawSectionHeading(
    '06',
    'Layout & Composition',
    board.layout.available ? 'M8 Regions + AI-Inferred' : 'Not yet analysed'
  );

  if (!board.layout.available) {
    drawWrappedParagraph('Layout and spatial composition analysis is not yet available.', {
      color: COLORS.faint
    });
  } else {
    if (board.layout.structureType) {
      drawKeyValueRow('Structure & Grid', `${board.layout.structureType} | ${board.layout.gridColumns ?? ''}`);
    }
    if (board.layout.alignment || board.layout.contentWidth) {
      drawKeyValueRow(
        'Alignment & Width',
        `${board.layout.alignment ?? 'Unspecified'} | ${board.layout.contentWidth ?? 'Unspecified'}`
      );
    }
    if (board.layout.spacing) {
      drawKeyValueRow(
        'Spacing Rhythm',
        `${board.layout.spacing.baseUnit} base unit | ${board.layout.spacing.density} density | padding ${board.layout.spacing.containerPadding}`
      );
    }
    if (regions.length > 0) {
      drawWrappedParagraph(`Verified M8 Regions (${regions.length}):`, {
        fontSize: 8.8,
        bold: true,
        color: COLORS.ink,
        gapAfter: 3
      });
      regions.forEach((reg, idx) => {
        const b = reg.boundingBox;
        drawWrappedParagraph(
          `${String(idx + 1).padStart(2, '0')}. ${reg.name} (${REGION_CATEGORY_SHORT_LABELS[reg.category]}) -- x:${Math.round(b.x * 100)}% y:${Math.round(b.y * 100)}% w:${Math.round(b.width * 100)}% h:${Math.round(b.height * 100)}% [${reg.confidence}]`,
          { fontSize: 8.4, indent: 8, gapAfter: 2 }
        );
      });
    }
  }

  // ── 07. Effects & Surface Language ─────────────────────────────────────
  drawSectionHeading(
    '07',
    'Effects & Surface Language',
    board.effects.available
      ? `AI-Inferred | ${board.effects.confidence ?? 'medium'} confidence`
      : 'Not yet analysed'
  );

  if (!board.effects.available) {
    drawWrappedParagraph('Surface and effects analysis is not yet available.', {
      color: COLORS.faint
    });
  } else {
    if (board.effects.elevationStyle) {
      drawKeyValueRow('Elevation Style', board.effects.elevationStyle);
    }
    if (board.effects.borderStyle) {
      drawKeyValueRow('Border Language', board.effects.borderStyle);
    }
    if (board.effects.shadowStyle) {
      drawKeyValueRow('Shadows & Blur', board.effects.shadowStyle);
    }
    if (board.effects.notes) {
      drawKeyValueRow('Surface Notes', board.effects.notes);
    }
    const surfaceItems = [...board.effects.surfaceElements, ...board.effects.decorativeElements];
    for (const el of surfaceItems.slice(0, 6)) {
      const basis =
        el.surfaceBasis === 'directly-visible-surface'
          ? 'Directly visible surface'
          : 'Inferred visual effect';
      drawWrappedParagraph(
        `- ${el.name} (${basis} | ${el.confidence}): ${el.characteristics.surfaceAndColor}`,
        { fontSize: 8.5, indent: 8, gapAfter: 2 }
      );
    }
  }

  // ── Footers on all pages ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 34, pageWidth - marginX, pageHeight - 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLORS.faint);
    doc.text(
      pdfText(`DesignDNA  |  ${image.name}  |  Local-first visual intelligence export`),
      marginX,
      pageHeight - 20
    );

    const pageLabel = `Page ${p} of ${totalPages}`;
    doc.text(pageLabel, pageWidth - marginX - doc.getTextWidth(pageLabel), pageHeight - 20);
  }

  return doc.output('blob');
}
