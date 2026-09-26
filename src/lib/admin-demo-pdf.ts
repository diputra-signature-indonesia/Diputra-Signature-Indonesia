const encoder = new TextEncoder();

function escapePdfText(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
}

export function createDemoPdf(title: string, lines: string[] = []) {
  const textCommands = [
    'BT',
    '/F1 22 Tf',
    `72 708 Td (${escapePdfText(title)}) Tj`,
    '/F1 12 Tf',
    ...lines.flatMap((line) => [`0 -34 Td (${escapePdfText(line)}) Tj`]),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${encoder.encode(textCommands).length} >>\nstream\n${textCommands}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  const header = '%PDF-1.4\n';
  const bodyParts: string[] = [];
  const offsets: number[] = [];
  let offset = encoder.encode(header).length;

  objects.forEach((object, index) => {
    offsets.push(offset);
    const part = `${index + 1} 0 obj\n${object}\nendobj\n`;
    bodyParts.push(part);
    offset += encoder.encode(part).length;
  });

  const xrefOffset = offset;
  const xrefEntries = offsets.map((itemOffset) => `${itemOffset.toString().padStart(10, '0')} 00000 n `).join('\n');
  const trailer = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${xrefEntries}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([header, ...bodyParts, trailer], { type: 'application/pdf' });
}
