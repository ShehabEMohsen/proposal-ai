import { NextRequest, NextResponse } from "next/server";
import HTMLtoDOCX from "html-to-docx";

export async function POST(req: NextRequest) {
  const { html, yourName } = await req.json();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Calibri, sans-serif; color: #1A1714; line-height: 1.6; }
          h2 { font-size: 16pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px; }
          p { font-size: 11pt; margin-bottom: 8px; }
          ul { padding-left: 20px; }
          li { font-size: 11pt; margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th { background: #f3f4f6; padding: 8px; border: 1px solid #ddd; font-size: 10pt; }
          td { padding: 8px; border: 1px solid #ddd; font-size: 10pt; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `;

  const buffer = await HTMLtoDOCX(htmlContent, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
  });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Proposal - ${yourName || "Draft"}.docx"`,
    },
  });
}