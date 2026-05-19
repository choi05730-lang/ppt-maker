import pptxgen from 'pptxgenjs';
import { BrandStyle, SlideContent } from '@/types';

const IN = (v: number) => v; // already in inches

export async function generatePptx(slides: SlideContent[], brand: BrandStyle): Promise<Blob> {
  const prs = new pptxgen();
  prs.defineLayout({ name: 'CUSTOM', width: brand.slideWidth, height: brand.slideHeight });
  prs.layout = 'CUSTOM';

  for (const slide of slides) {
    const s = prs.addSlide();

    // Background
    s.background = { fill: brand.bgColor.replace('#', '') };

    // Logo on every slide
    if (brand.logoBase64 && brand.logoX !== undefined) {
      s.addImage({
        data: brand.logoBase64,
        x: brand.logoX,
        y: brand.logoY ?? 0,
        w: brand.logoW ?? 1,
        h: brand.logoH ?? 0.5,
      });
    }

    switch (slide.layout) {
      case 'title':
        renderTitle(s, slide, brand);
        break;
      case 'bullets':
        renderBullets(s, slide, brand);
        break;
      case 'image':
        renderImage(s, slide, brand);
        break;
      case 'split':
        renderSplit(s, slide, brand);
        break;
      case 'table':
        renderTable(s, slide, brand);
        break;
    }
  }

  const blob = await prs.write({ outputType: 'blob' }) as Blob;
  return blob;
}

function titleOpts(brand: BrandStyle) {
  return {
    fontFace: brand.titleFont,
    fontSize: brand.titleSize,
    bold: brand.titleBold,
    color: brand.primaryColor.replace('#', ''),
  };
}

function bodyOpts(brand: BrandStyle) {
  return {
    fontFace: brand.bodyFont,
    fontSize: brand.bodySize,
    color: '404040',
  };
}

function renderTitle(s: pptxgen.Slide, slide: SlideContent, brand: BrandStyle) {
  s.addText(slide.title, {
    x: 1, y: brand.slideHeight / 2 - 0.6,
    w: brand.slideWidth - 2, h: 1.2,
    align: 'center',
    ...titleOpts(brand),
    fontSize: brand.titleSize + 6,
  });
  if (slide.body) {
    s.addText(slide.body, {
      x: 1.5, y: brand.slideHeight / 2 + 0.8,
      w: brand.slideWidth - 3, h: 0.8,
      align: 'center',
      ...bodyOpts(brand),
    });
  }
}

function renderBullets(s: pptxgen.Slide, slide: SlideContent, brand: BrandStyle) {
  s.addText(slide.title, {
    x: 0.5, y: 0.3, w: brand.slideWidth - 1, h: 0.9,
    ...titleOpts(brand),
  });
  // Divider line
  s.addShape(pptxgen.ShapeType.line, {
    x: 0.5, y: 1.25, w: brand.slideWidth - 1, h: 0,
    line: { color: brand.accentColor.replace('#', ''), width: 2 },
  });
  const bullets = slide.bullets ?? (slide.body ? slide.body.split('\n') : []);
  const bulletObjs = bullets.map(b => ({ text: b, options: { bullet: true, indentLevel: 0 } }));
  if (bulletObjs.length > 0) {
    s.addText(bulletObjs, {
      x: 0.5, y: 1.45, w: brand.slideWidth - 1, h: brand.slideHeight - 2,
      ...bodyOpts(brand),
      valign: 'top',
    });
  }
}

function renderImage(s: pptxgen.Slide, slide: SlideContent, brand: BrandStyle) {
  s.addText(slide.title, {
    x: 0.5, y: 0.3, w: brand.slideWidth - 1, h: 0.9,
    ...titleOpts(brand),
  });
  s.addShape(pptxgen.ShapeType.line, {
    x: 0.5, y: 1.25, w: brand.slideWidth - 1, h: 0,
    line: { color: brand.accentColor.replace('#', ''), width: 2 },
  });
  if (slide.imageUrl) {
    s.addImage({
      data: slide.imageUrl,
      x: (brand.slideWidth - 6) / 2, y: 1.5,
      w: 6, h: brand.slideHeight - 3,
    });
  }
  if (slide.imageCaption) {
    s.addText(slide.imageCaption, {
      x: 0.5, y: brand.slideHeight - 1.1, w: brand.slideWidth - 1, h: 0.7,
      align: 'center', ...bodyOpts(brand), fontSize: brand.bodySize - 2,
      italic: true,
    });
  }
}

function renderSplit(s: pptxgen.Slide, slide: SlideContent, brand: BrandStyle) {
  s.addText(slide.title, {
    x: 0.5, y: 0.3, w: brand.slideWidth - 1, h: 0.9,
    ...titleOpts(brand),
  });
  s.addShape(pptxgen.ShapeType.line, {
    x: 0.5, y: 1.25, w: brand.slideWidth - 1, h: 0,
    line: { color: brand.accentColor.replace('#', ''), width: 2 },
  });
  const half = (brand.slideWidth - 1.5) / 2;
  const bullets = slide.bullets ?? (slide.body ? slide.body.split('\n') : []);
  if (bullets.length > 0) {
    const bulletObjs = bullets.map(b => ({ text: b, options: { bullet: true } }));
    s.addText(bulletObjs, {
      x: 0.5, y: 1.5, w: half, h: brand.slideHeight - 2.2,
      ...bodyOpts(brand), valign: 'top',
    });
  }
  if (slide.imageUrl) {
    s.addImage({
      data: slide.imageUrl,
      x: 0.5 + half + 0.5, y: 1.5,
      w: half, h: brand.slideHeight - 2.5,
    });
  } else if (slide.rightContent) {
    s.addText(slide.rightContent, {
      x: 0.5 + half + 0.5, y: 1.5, w: half, h: brand.slideHeight - 2.2,
      ...bodyOpts(brand), valign: 'top',
    });
  }
}

function renderTable(s: pptxgen.Slide, slide: SlideContent, brand: BrandStyle) {
  s.addText(slide.title, {
    x: 0.5, y: 0.3, w: brand.slideWidth - 1, h: 0.9,
    ...titleOpts(brand),
  });
  s.addShape(pptxgen.ShapeType.line, {
    x: 0.5, y: 1.25, w: brand.slideWidth - 1, h: 0,
    line: { color: brand.accentColor.replace('#', ''), width: 2 },
  });
  if (!slide.tableData || slide.tableData.length === 0) return;
  const rows = slide.tableData.map((row, ri) =>
    row.map(cell => ({
      text: cell,
      options: {
        bold: ri === 0,
        fill: { color: ri === 0 ? brand.primaryColor.replace('#', '') : (ri % 2 === 0 ? 'F0F0F0' : 'FFFFFF') },
        color: ri === 0 ? 'FFFFFF' : '333333',
        fontFace: ri === 0 ? brand.titleFont : brand.bodyFont,
        fontSize: brand.bodySize - 2,
        align: 'center' as const,
      },
    }))
  );
  s.addTable(rows, {
    x: 0.5, y: 1.5,
    w: brand.slideWidth - 1,
    h: brand.slideHeight - 2.2,
    border: { type: 'solid', color: 'CCCCCC', pt: 1 },
  });
}
