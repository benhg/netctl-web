import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { NetSession, Participant, LogEntry } from '../types';

export async function generateICS309PDF(
  session: NetSession,
  participants: Participant[],
  logEntries: LogEntry[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

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
  page.drawText(`Checked-In Stations (${participants.length}):`, {
    x: margin,
    y: y,
    size: 10,
    font: helveticaBold,
  });
  y -= 15;

  const participantsList = participants.map(p => {
    const tactical = p.tacticalCall ? `${p.tacticalCall} / ` : '';
    return `${tactical}${p.callsign} (${p.name})`;
  }).join(', ');

  // Simple word wrap for participants
  let remaining = participantsList;
  while (remaining.length > 0 && y > 250) {
    const line = remaining.substring(0, 80);
    const breakPoint = line.length < 80 ? line.length : line.lastIndexOf(', ') + 2 || 80;
    page.drawText(remaining.substring(0, breakPoint), { x: margin, y: y, size: 8, font: helvetica });
    remaining = remaining.substring(breakPoint);
    y -= 12;
  }

  y -= 10;

  // 4. Log Table Header
  page.drawText('4. Log (Communications)', { x: margin, y: y, size: 10, font: helveticaBold });
  y -= 20;

  // Table header
  const colWidths = [30, 50, 70, 70, 200];
  const colX = [margin];
  for (let i = 1; i < colWidths.length; i++) {
    colX.push(colX[i - 1] + colWidths[i - 1]);
  }

  // Draw header row
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: width - 2 * margin,
    height: 15,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });

  page.drawText('#', { x: colX[0] + 5, y: y - 12, size: 9, font: helveticaBold });
  page.drawText('Time', { x: colX[1] + 5, y: y - 12, size: 9, font: helveticaBold });
  page.drawText('From', { x: colX[2] + 5, y: y - 12, size: 9, font: helveticaBold });
  page.drawText('To', { x: colX[3] + 5, y: y - 12, size: 9, font: helveticaBold });
  page.drawText('Subject/Remarks', { x: colX[4] + 5, y: y - 12, size: 9, font: helveticaBold });

  y -= 15;

  // Table rows
  for (const entry of logEntries) {
    if (y < 80) break;

    page.drawRectangle({
      x: margin,
      y: y - 15,
      width: width - 2 * margin,
      height: 15,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
    });

    const time = new Date(entry.time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const message = entry.message.length > 40 ? entry.message.substring(0, 37) + '...' : entry.message;

    page.drawText(String(entry.entryNumber), { x: colX[0] + 5, y: y - 12, size: 8, font: helvetica });
    page.drawText(time, { x: colX[1] + 5, y: y - 12, size: 8, font: helvetica });
    page.drawText(entry.fromCallsign, { x: colX[2] + 5, y: y - 12, size: 8, font: helvetica });
    page.drawText(entry.toCallsign, { x: colX[3] + 5, y: y - 12, size: 8, font: helvetica });
    page.drawText(message || '-', { x: colX[4] + 5, y: y - 12, size: 8, font: helvetica });

    y -= 15;
  }

  // Footer
  y = 60;
  page.drawText('5. Prepared by:', { x: margin, y: y, size: 9, font: helvetica });
  page.drawLine({
    start: { x: margin + 80, y: y - 2 },
    end: { x: margin + 200, y: y - 2 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });

  page.drawText('Page 1 of 1', { x: width - margin - 60, y: y, size: 9, font: helvetica });

  return await pdfDoc.save();
}
