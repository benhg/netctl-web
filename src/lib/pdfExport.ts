import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { NetSession, Participant, LogEntry } from '../types';

export async function generateICS309PDF(
  session: NetSession,
  participants: Participant[],
  logEntries: LogEntry[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const pages: PDFPage[] = [];
  const createPage = () => {
    const page = pdfDoc.addPage([612, 792]); // Letter size
    pages.push(page);
    return page;
  };
  let page = createPage();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;
  const footerSpace = 80;
  const colWidths = [30, 50, 70, 70, 200];
  const colX = [margin];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }

  const drawLogTableHeader = (currentPage: typeof page, startY: number, isContinuation: boolean) => {
    const title = isContinuation ? '4. Log (Communications) (cont.)' : '4. Log (Communications)';
    currentPage.drawText(title, { x: margin, y: startY, size: 10, font: helveticaBold });
    let nextY = startY - 20;

    currentPage.drawRectangle({
      x: margin,
      y: nextY - 15,
      width: width - 2 * margin,
      height: 15,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    });

    currentPage.drawText('#', { x: colX[0] + 5, y: nextY - 12, size: 9, font: helveticaBold });
    currentPage.drawText('Time', { x: colX[1] + 5, y: nextY - 12, size: 9, font: helveticaBold });
    currentPage.drawText('From', { x: colX[2] + 5, y: nextY - 12, size: 9, font: helveticaBold });
    currentPage.drawText('To', { x: colX[3] + 5, y: nextY - 12, size: 9, font: helveticaBold });
    currentPage.drawText('Subject/Remarks', { x: colX[4] + 5, y: nextY - 12, size: 9, font: helveticaBold });

    return nextY - 15;
  };

  // Title
  page.drawText('ICS 309 - COMMUNICATIONS LOG', {
    x: margin,
    y: y,
    size: 16,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // Draw border box for header info
  page.drawRectangle({
    x: margin,
    y: y - 60,
    width: width - 2 * margin,
    height: 60,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  // 1. Incident Name
  page.drawText('1. Incident Name:', { x: margin + 5, y: y - 15, size: 9, font: helvetica });
  page.drawText(session.name, { x: margin + 5, y: y - 28, size: 11, font: helveticaBold });

  // 2. Operational Period
  const midX = width / 2;
  page.drawText('2. Operational Period:', { x: midX, y: y - 15, size: 9, font: helvetica });
  const startStr = new Date(session.dateTime).toLocaleString();
  const lastEntry = logEntries[logEntries.length - 1];
  const rawEndTime = session.status === 'closed'
    ? session.endTime || lastEntry?.time || session.dateTime
    : null;
  const endStr = rawEndTime ? new Date(rawEndTime).toLocaleString() : 'Present';
  page.drawText(`Start: ${startStr}`, { x: midX, y: y - 28, size: 10, font: helvetica });
  page.drawText(`End: ${endStr}`, { x: midX, y: y - 42, size: 10, font: helvetica });

  y -= 75;

  // 3. Radio Operator box
  page.drawRectangle({
    x: margin,
    y: y - 45,
    width: width - 2 * margin,
    height: 45,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  page.drawText('3. Radio Operator (Name, Call Sign):', { x: margin + 5, y: y - 15, size: 9, font: helvetica });
  page.drawText(`${session.netControlName} - ${session.netControlOp}`, {
    x: margin + 5,
    y: y - 30,
    size: 11,
    font: helveticaBold,
  });
  page.drawText(`Frequency: ${session.frequency}`, { x: midX, y: y - 30, size: 10, font: helvetica });

  y -= 60;

  // Participants section
  const startNewPage = () => {
    page = createPage();
    y = height - margin;
  };

  const ensureSpace = (requiredHeight: number) => {
    if (y - requiredHeight < footerSpace) {
      startNewPage();
    }
  };

  const drawParticipantsHeader = (isContinuation: boolean) => {
    const label = isContinuation
      ? `Checked-In Stations (${participants.length}) (cont.):`
      : `Checked-In Stations (${participants.length}):`;
    ensureSpace(15);
    page.drawText(label, { x: margin, y: y, size: 10, font: helveticaBold });
    y -= 15;
  };

  drawParticipantsHeader(false);

  const participantsList = participants.map(p => {
    const tactical = p.tacticalCall ? `${p.tacticalCall} / ` : '';
    return `${tactical}${p.callsign} (${p.name})`;
  }).join(', ');

  // Simple word wrap for participants
  const participantLineHeight = 12;
  let remaining = participantsList;
  while (remaining.length > 0) {
    if (y - participantLineHeight < footerSpace) {
      startNewPage();
      drawParticipantsHeader(true);
    }
    const line = remaining.substring(0, 80);
    const breakPoint = line.length < 80 ? line.length : line.lastIndexOf(', ') + 2 || 80;
    page.drawText(remaining.substring(0, breakPoint), { x: margin, y: y, size: 8, font: helvetica });
    remaining = remaining.substring(breakPoint);
    y -= participantLineHeight;
  }

  y -= 10;

  const minRowHeight = 15;
  const lineHeight = 10;
  const headerHeight = 35;

  if (y - headerHeight - minRowHeight < footerSpace) {
    page = createPage();
    y = height - margin;
  }

  y = drawLogTableHeader(page, y, false);
  const wrapText = (text: string, maxWidth: number, font: typeof helvetica, size: number) => {
    if (!text) return ['-'];
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else if (current) {
        lines.push(current);
        current = word;
      } else {
        let slice = '';
        for (const char of word) {
          const next = slice + char;
          if (font.widthOfTextAtSize(next, size) > maxWidth && slice) {
            lines.push(slice);
            slice = char;
          } else {
            slice = next;
          }
        }
        current = slice;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : ['-'];
  };

  let rowY = y;

  for (const entry of logEntries) {
    const time = new Date(entry.time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const messageLines = wrapText(entry.message || '-', colWidths[4] - 10, helvetica, 8);
    const rowHeight = Math.max(minRowHeight, messageLines.length * lineHeight + 6);

    if (rowY - rowHeight < footerSpace) {
      page = createPage();
      rowY = drawLogTableHeader(page, height - margin, true);
    }

    page.drawRectangle({
      x: margin,
      y: rowY - rowHeight,
      width: width - 2 * margin,
      height: rowHeight,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
    });

    const textY = rowY - 12;
    page.drawText(String(entry.entryNumber), { x: colX[0] + 5, y: textY, size: 8, font: helvetica });
    page.drawText(time, { x: colX[1] + 5, y: textY, size: 8, font: helvetica });
    page.drawText(entry.fromCallsign, { x: colX[2] + 5, y: textY, size: 8, font: helvetica });
    page.drawText(entry.toCallsign, { x: colX[3] + 5, y: textY, size: 8, font: helvetica });
    messageLines.forEach((line, index) => {
      page.drawText(line, { x: colX[4] + 5, y: textY - index * lineHeight, size: 8, font: helvetica });
    });

    rowY -= rowHeight;
  }

  // Footer (page numbers on all pages, prepared-by on last page)
  pages.forEach((currentPage, index) => {
    const footerY = 60;
    const pageNumberText = `Page ${index + 1} of ${pages.length}`;
    currentPage.drawText(pageNumberText, { x: width - margin - 60, y: footerY, size: 9, font: helvetica });

    if (index === pages.length - 1) {
      currentPage.drawText('5. Prepared by:', { x: margin, y: footerY, size: 9, font: helvetica });
      if (session.preparedBy) {
        currentPage.drawText(session.preparedBy, {
          x: margin + 85,
          y: footerY - 12,
          size: 9,
          font: helveticaBold,
        });
      }
      currentPage.drawLine({
        start: { x: margin + 80, y: footerY - 2 },
        end: { x: margin + 200, y: footerY - 2 },
        thickness: 0.5,
        color: rgb(0, 0, 0),
      });
    }
  });

  return await pdfDoc.save();
}
