import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Braces,
  Component,
  History,
  Layers,
  LayoutGrid,
  LayoutPanelTop,
  Palette,
  Ruler,
  ScanLine,
  ScanSearch,
  Settings,
  Type
} from 'lucide-react';

export type PageId =
  | 'overview'
  | 'visual-investigation'
  | 'new-analysis'
  | 'recent-analyses'
  | 'colors'
  | 'typography'
  | 'spacing'
  | 'components'
  | 'layout'
  | 'effects'
  | 'design-tokens'
  | 'settings'
  | 'help';

export type DesignSystemSectionId =
  | 'colors'
  | 'typography'
  | 'spacing'
  | 'components'
  | 'layout'
  | 'effects'
  | 'design-tokens';

export interface PrimaryNavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export interface DesignSystemNavItem {
  id: DesignSystemSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface PageMeta {
  title: string;
  section: string;
  description: string;
}

export const MAIN_NAV_ITEMS: readonly PrimaryNavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'visual-investigation', label: 'Visual Investigation', icon: ScanSearch },
  { id: 'new-analysis', label: 'New Analysis', icon: ScanLine },
  { id: 'recent-analyses', label: 'Recent Analyses', icon: History }
];

export const DESIGN_SYSTEM_NAV_ITEMS: readonly DesignSystemNavItem[] = [
  {
    id: 'colors',
    label: 'Colors',
    description: 'Measured palette, semantic roles, and contrast ratios.',
    icon: Palette
  },
  {
    id: 'typography',
    label: 'Typography',
    description: 'Type scale, weights, line heights, and font families.',
    icon: Type
  },
  {
    id: 'spacing',
    label: 'Spacing',
    description: 'Base spacing unit, rhythm steps, and padding patterns.',
    icon: Ruler
  },
  {
    id: 'components',
    label: 'Components',
    description: 'Buttons, inputs, cards, and interactive element anatomy.',
    icon: Component
  },
  {
    id: 'layout',
    label: 'Layout',
    description: 'Grid columns, container widths, and page structure.',
    icon: LayoutPanelTop
  },
  {
    id: 'effects',
    label: 'Effects',
    description: 'Border radii, elevation layers, dividers, and surfaces.',
    icon: Layers
  },
  {
    id: 'design-tokens',
    label: 'Design Tokens',
    description: 'Structured CSS custom properties and JSON token bundles.',
    icon: Braces
  }
];

export const UTILITY_NAV_ITEMS: readonly PrimaryNavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Docs', icon: BookOpen }
];

export const PAGE_METADATA: Record<PageId, PageMeta> = {
  overview: {
    title: 'Overview',
    section: 'Workspace',
    description: 'Analysis dashboard, token metrics, visual summary, and section navigation.'
  },
  'visual-investigation': {
    title: 'Visual Investigation',
    section: 'Workspace',
    description: 'Interactive screenshot canvas, region annotations, and contextual visual inspection.'
  },
  'new-analysis': {
    title: 'New Analysis',
    section: 'Workspace',
    description: 'Prepare a website screenshot for design system extraction.'
  },
  'recent-analyses': {
    title: 'Recent Analyses',
    section: 'Workspace',
    description: 'Active in-memory session record without persistent history.'
  },
  colors: {
    title: 'Colors',
    section: 'Design System',
    description: 'Measured colour palette and AI-inferred semantic colour roles.'
  },
  typography: {
    title: 'Typography',
    section: 'Design System',
    description: 'AI-inferred font classification, scale, and typographic hierarchy.'
  },
  spacing: {
    title: 'Spacing',
    section: 'Design System',
    description: 'AI-inferred base spacing unit, density, and scale steps.'
  },
  components: {
    title: 'Components',
    section: 'Design System',
    description: 'AI-inferred UI component patterns and visual treatments.'
  },
  layout: {
    title: 'Layout',
    section: 'Design System',
    description: 'AI-inferred grid geometry, alignment, and structural regions.'
  },
  effects: {
    title: 'Effects',
    section: 'Design System',
    description: 'AI-inferred elevation hierarchy, borders, shadows, and corner radii.'
  },
  'design-tokens': {
    title: 'Design Tokens',
    section: 'Design System',
    description: 'Unified, normalised semantic design tokens with provenance, CSS variables, and JSON output.'
  },
  settings: {
    title: 'Settings',
    section: 'Application',
    description: 'Appearance, local-first runtime behaviour, and version details.'
  },
  help: {
    title: 'Help & Documentation',
    section: 'Application',
    description: 'Workflow overview and milestone capabilities.'
  }
};

export const APP_VERSION = '0.1.0';
export const APP_MILESTONE = 'M8 Visual Investigation';
export const PRODUCT_POSITIONING = 'Website Visual Intelligence';
export const PRODUCT_TAGLINE = 'Deconstruct any website. Discover its visual DNA.';
