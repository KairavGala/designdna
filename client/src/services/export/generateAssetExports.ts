import { strToU8, zipSync, type Zippable } from 'fflate';
import type { DesignAnatomyBoardModel } from '../../types/anatomyBoard';
import type { DesignSystem } from '../../types/designSystem';
import type {
  AnalysisPackageManifest,
  ExportFilenames,
  PackageManifestFileEntry,
  VisualAssetEntry,
  VisualAssetsManifest
} from '../../types/exportSuite';
import {
  ELEMENT_CATEGORY_SHORT_LABELS,
  type ElementVisualAssets,
  type PatternRelationship,
  type VisualElement,
  type VisualRegion
} from '../../types/investigation';
import type { UploadedImage } from '../../types/upload';
import { normalizedBoxToPixels } from '../investigation/regionSchema';
import { analysisPackageManifestSchema, visualAssetsManifestSchema } from './exportSchemas';
import { sanitizeFilenameSlug } from './filenameUtils';
import { buildMarkdownAnatomyReport } from './generateMarkdownReport';
import { buildPdfAnatomyReport } from './generatePdfReport';
import { buildCssExport, buildStructuredJsonExport } from './generateTokenExports';

function decodeDataUrlToBytes(dataUrl: string): Uint8Array | null {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const base64 = dataUrl.slice(commaIdx + 1);
  if (!base64) return null;
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function readUploadedFileBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

function extensionForImage(image: UploadedImage): string {
  const extFromName = image.name.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extFromName)) {
    return extFromName;
  }
  const fmt = image.format.toLowerCase();
  if (fmt === 'jpeg' || fmt === 'jpg') return 'jpg';
  if (fmt === 'webp') return 'webp';
  return 'png';
}

/**
 * Deterministically inventories all genuine screenshot-derived visual assets
 * (M9 cropped motifs, components, multi-occurrence pattern crops, and optional
 * original uploaded screenshot). Never fabricates or regenerates visual assets.
 */
export function collectVisualAssets(params: {
  image: UploadedImage | null;
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  elementAssets: Record<string, ElementVisualAssets>;
  includeOriginalScreenshot: boolean;
}): VisualAssetEntry[] {
  const { image, elements, elementAssets, includeOriginalScreenshot } = params;
  if (!image) return [];

  const entries: VisualAssetEntry[] = [];
  const usedPaths = new Set<string>();

  const makeUniquePath = (folder: VisualAssetEntry['folder'], baseSlug: string, ext: string) => {
    const safeSlug = baseSlug || 'asset';
    let candidate = `assets/${folder}/${safeSlug}.${ext}`;
    let counter = 2;
    while (usedPaths.has(candidate)) {
      candidate = `assets/${folder}/${safeSlug}-${counter}.${ext}`;
      counter += 1;
    }
    usedPaths.add(candidate);
    const filename = candidate.split('/').pop() ?? `${safeSlug}.${ext}`;
    return { path: candidate, filename };
  };

  for (const el of elements) {
    const asset = elementAssets[el.id];
    if (!asset?.primaryCropUrl) continue;

    const folder: VisualAssetEntry['folder'] =
      el.category === 'component-style' ? 'components' : 'motifs';
    const baseSlug = sanitizeFilenameSlug(`${el.subcategory}-${el.name}`, 40) || el.id;
    const primaryFile = makeUniquePath(folder, baseSlug, 'png');
    const px = normalizedBoxToPixels(el.boundingBox, image.width, image.height);

    entries.push({
      id: `crop-${el.id}`,
      path: primaryFile.path,
      folder,
      filename: primaryFile.filename,
      category: ELEMENT_CATEGORY_SHORT_LABELS[el.category],
      sourceFindingId: el.id,
      sourceFindingName: el.name,
      parentRegionName: el.parentRegionName,
      provenance: 'ai-inferred',
      confidence: el.confidence,
      occurrenceIndex: el.occurrenceCount > 1 ? 1 : null,
      pixelDimensions: { width: px.width, height: px.height },
      measuredColors: asset.measuredColors.map((c) => ({
        hex: c.hex,
        percentage: c.percentage
      })),
      dataUrl: asset.primaryCropUrl
    });

    // Multi-occurrence pattern comparison crops (when >= 2 verified instances exist)
    if (asset.occurrenceCropUrls.length >= 2) {
      const allBoxes = [el.boundingBox, ...el.additionalLocations];
      asset.occurrenceCropUrls.forEach((occUrl, idx) => {
        const occBox = allBoxes[idx] ?? el.boundingBox;
        const occPx = normalizedBoxToPixels(occBox, image.width, image.height);
        const occFile = makeUniquePath('patterns', `${baseSlug}-instance-${idx + 1}`, 'png');
        entries.push({
          id: `pattern-${el.id}-occ-${idx + 1}`,
          path: occFile.path,
          folder: 'patterns',
          filename: occFile.filename,
          category: 'Pattern Comparison Crop',
          sourceFindingId: el.id,
          sourceFindingName: `${el.name} (Instance #${idx + 1})`,
          parentRegionName: el.parentRegionName,
          provenance: 'ai-inferred',
          confidence: el.confidence,
          occurrenceIndex: idx + 1,
          pixelDimensions: { width: occPx.width, height: occPx.height },
          measuredColors: asset.measuredColors.map((c) => ({
            hex: c.hex,
            percentage: c.percentage
          })),
          dataUrl: occUrl
        });
      });
    }
  }

  // Original uploaded screenshot ONLY when explicitly selected by the user
  if (includeOriginalScreenshot) {
    const ext = extensionForImage(image);
    const origSlug = sanitizeFilenameSlug(image.name, 40) || 'original-screenshot';
    const origFile = makeUniquePath('source', origSlug, ext);
    entries.push({
      id: 'source-original-screenshot',
      path: origFile.path,
      folder: 'source',
      filename: origFile.filename,
      category: 'Original Screenshot',
      sourceFindingId: null,
      sourceFindingName: image.name,
      parentRegionName: null,
      provenance: 'measured',
      confidence: 'high',
      occurrenceIndex: null,
      pixelDimensions: { width: image.width, height: image.height },
      measuredColors: []
    });
  }

  return entries;
}

export function buildVisualAssetsManifest(params: {
  image: UploadedImage;
  assets: readonly VisualAssetEntry[];
  includeOriginalScreenshot: boolean;
  generatedAt?: string;
}): VisualAssetsManifest {
  const manifest: VisualAssetsManifest = {
    generator: 'DesignDNA',
    manifestVersion: '1.0.0',
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    sourceFile: params.image.name,
    includesOriginalScreenshot: params.includeOriginalScreenshot,
    totalAssets: params.assets.length,
    assets: params.assets.map(({ dataUrl: _omit, ...rest }) => rest)
  };
  return visualAssetsManifestSchema.parse(manifest);
}

/**
 * Bundles genuine screenshot crops (+ optional original screenshot if explicitly toggled)
 * and a Zod-validated `assets-manifest.json` into a browser-generated ZIP Blob.
 */
export async function buildVisualAssetsZip(params: {
  image: UploadedImage;
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  elementAssets: Record<string, ElementVisualAssets>;
  includeOriginalScreenshot: boolean;
}): Promise<{ blob: Blob; manifest: VisualAssetsManifest; fileCount: number }> {
  const assets = collectVisualAssets(params);
  if (assets.length === 0) {
    throw new Error('No screenshot-derived visual assets are available to export.');
  }

  const manifest = buildVisualAssetsManifest({
    image: params.image,
    assets,
    includeOriginalScreenshot: params.includeOriginalScreenshot
  });

  const zipEntries: Zippable = {};
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  zipEntries['assets-manifest.json'] = [strToU8(manifestText), { level: 6 }];

  for (const entry of assets) {
    if (entry.id === 'source-original-screenshot') {
      const origBytes = await readUploadedFileBytes(params.image.file);
      // Store binary image uncompressed to preserve exact original bytes & quality
      zipEntries[entry.path] = [origBytes, { level: 0 }];
    } else if (entry.dataUrl) {
      const pngBytes = decodeDataUrlToBytes(entry.dataUrl);
      if (pngBytes) {
        zipEntries[entry.path] = [pngBytes, { level: 0 }];
      }
    }
  }

  const archiveBytes = zipSync(zipEntries);
  const blob = new Blob([archiveBytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
  return {
    blob,
    manifest,
    fileCount: Object.keys(zipEntries).length
  };
}

export interface CompletePackageZipInput {
  image: UploadedImage;
  filenames: ExportFilenames;
  board: DesignAnatomyBoardModel;
  designSystem: DesignSystem | null;
  regions: readonly VisualRegion[];
  elements: readonly VisualElement[];
  patterns: readonly PatternRelationship[];
  elementAssets: Record<string, ElementVisualAssets>;
  aiModel: string | null;
  includeOriginalScreenshot: boolean;
}

/**
 * Bundles all available M11 exports (CSS, JSON, Markdown report, PDF report,
 * available visual asset crops, optional original screenshot, and Zod-validated
 * package manifest) into a single local-first ZIP archive.
 */
export async function buildCompleteAnalysisPackageZip(
  input: CompletePackageZipInput
): Promise<{ blob: Blob; manifest: AnalysisPackageManifest }> {
  const {
    image,
    filenames,
    board,
    designSystem,
    regions,
    elements,
    patterns,
    elementAssets,
    aiModel,
    includeOriginalScreenshot
  } = input;

  const generatedAt = new Date().toISOString();
  const zipEntries: Zippable = {};
  const fileList: PackageManifestFileEntry[] = [];

  const addTextFile = (
    path: string,
    format: string,
    category: PackageManifestFileEntry['category'],
    description: string,
    text: string
  ) => {
    const bytes = strToU8(text);
    zipEntries[path] = [bytes, { level: 6 }];
    fileList.push({ path, format, category, description, bytes: bytes.byteLength });
  };

  const addBinaryFile = (
    path: string,
    format: string,
    category: PackageManifestFileEntry['category'],
    description: string,
    bytes: Uint8Array,
    level: 0 | 6 = 0
  ) => {
    zipEntries[path] = [bytes, { level }];
    fileList.push({ path, format, category, description, bytes: bytes.byteLength });
  };

  // 1. Developer Token Exports (CSS & Structured JSON)
  if (designSystem) {
    const cssExport = buildCssExport(designSystem);
    addTextFile(
      `tokens/${filenames.css}`,
      'text/css',
      'developer',
      `CSS custom properties (${cssExport.variableCount} semantic variables)`,
      cssExport.cssText
    );

    const jsonExport = buildStructuredJsonExport({
      designSystem,
      board,
      regions,
      elements,
      patterns
    });
    addTextFile(
      `tokens/${filenames.json}`,
      'application/json',
      'developer',
      'Structured JSON design tokens with provenance, confidence, evidence, and reconciliation',
      jsonExport.jsonText
    );
  }

  // 2. Design Documentation (Markdown & PDF)
  if (board.completeness.populatedSections > 0) {
    const markdownText = buildMarkdownAnatomyReport({
      image,
      board,
      designSystem,
      regions,
      elements,
      patterns,
      aiModel
    });
    addTextFile(
      `report/${filenames.markdown}`,
      'text/markdown',
      'documentation',
      `Design Anatomy Report in Markdown (${board.completeness.populatedSections}/7 sections)`,
      markdownText
    );

    const pdfBlob = buildPdfAnatomyReport({
      image,
      board,
      designSystem,
      regions,
      elements,
      patterns,
      elementAssets,
      aiModel
    });
    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
    addBinaryFile(
      `report/${filenames.pdf}`,
      'application/pdf',
      'documentation',
      `Design Anatomy Report PDF (${board.completeness.populatedSections}/7 sections)`,
      pdfBytes,
      0
    );
  }

  // 3. Screenshot-Derived Visual Assets (+ optional original screenshot)
  const collectedAssets = collectVisualAssets({
    image,
    elements,
    patterns,
    elementAssets,
    includeOriginalScreenshot
  });

  let croppedCount = 0;
  if (collectedAssets.length > 0) {
    const assetsManifest = buildVisualAssetsManifest({
      image,
      assets: collectedAssets,
      includeOriginalScreenshot,
      generatedAt
    });
    addTextFile(
      'assets/assets-manifest.json',
      'application/json',
      'assets',
      `Index manifest for ${collectedAssets.length} visual asset(s)`,
      `${JSON.stringify(assetsManifest, null, 2)}\n`
    );

    for (const entry of collectedAssets) {
      if (entry.id === 'source-original-screenshot') {
        const origBytes = await readUploadedFileBytes(image.file);
        addBinaryFile(
          entry.path,
          image.file.type || 'image/png',
          'assets',
          `Original uploaded screenshot (${image.width}x${image.height}px)`,
          origBytes,
          0
        );
      } else if (entry.dataUrl) {
        const pngBytes = decodeDataUrlToBytes(entry.dataUrl);
        if (pngBytes) {
          croppedCount += 1;
          addBinaryFile(
            entry.path,
            'image/png',
            'assets',
            `${entry.category}: ${entry.sourceFindingName}`,
            pngBytes,
            0
          );
        }
      }
    }
  }

  if (fileList.length === 0) {
    throw new Error('No analysis artifacts are ready to package yet.');
  }

  // 4. Package Manifest (Zod-validated)
  const manifestCandidate: AnalysisPackageManifest = {
    generator: 'DesignDNA',
    manifestVersion: '1.0.0',
    milestone: 'M11',
    generatedAt,
    privacy: {
      localOnlyGeneration: true,
      includesOriginalScreenshot: includeOriginalScreenshot,
      containsSecrets: false
    },
    source: {
      fileName: image.name,
      format: image.format,
      width: image.width,
      height: image.height,
      aiModel
    },
    completeness: {
      hasMeasuredColors: board.completeness.hasMeasuredColors,
      hasVisualAi: board.completeness.hasVisualAi,
      hasDesignTokens: Boolean(designSystem),
      populatedBoardSections: board.completeness.populatedSections,
      totalBoardSections: 7,
      tokenCount: designSystem?.metrics.totalTokens ?? 0,
      regionCount: regions.length,
      visualElementCount: elements.length,
      patternCount: patterns.length,
      croppedAssetCount: croppedCount
    },
    files: fileList
  };

  const manifest = analysisPackageManifestSchema.parse(manifestCandidate);
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  zipEntries['manifest.json'] = [strToU8(manifestText), { level: 6 }];

  const archiveBytes = zipSync(zipEntries);
  const blob = new Blob([archiveBytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' });

  return { blob, manifest };
}
