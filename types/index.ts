export type LayoutType = 'title' | 'bullets' | 'image' | 'split' | 'table';

export interface SlideContent {
  id: string;
  layout: LayoutType;
  title: string;
  bullets?: string[];
  body?: string;
  imageUrl?: string; // base64 or blob URL
  imageCaption?: string;
  rightContent?: string; // for split layout
  tableData?: string[][];
}

export interface BrandStyle {
  titleFont: string;
  bodyFont: string;
  titleSize: number;
  bodySize: number;
  titleBold: boolean;
  colors: string[]; // hex codes
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  slideWidth: number;  // in inches
  slideHeight: number;
  logoBase64?: string;
  logoX?: number;
  logoY?: number;
  logoW?: number;
  logoH?: number;
}

export interface PresentationConfig {
  brand: BrandStyle;
  slides: SlideContent[];
}
