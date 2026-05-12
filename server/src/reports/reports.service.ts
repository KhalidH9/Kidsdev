import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ChildrenService } from '../children/children.service';
import { BehaviorLogsService } from '../behavior-logs/behavior-logs.service';
import { SupabaseService } from '../supabase/supabase.service';

export interface ChildReportInput {
  schoolId: string;
  childId: string;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly children: ChildrenService,
    private readonly logs: BehaviorLogsService,
    private readonly supabase: SupabaseService,
  ) {}

  async childReportPdf(input: ChildReportInput): Promise<Buffer> {
    const child = await this.children.findById(input.schoolId, input.childId);
    const goals = await this.supabase.admin
      .from('goals').select('title, status').eq('child_id', child.id).eq('status', 'active');
    const reinforcements = await this.supabase.admin
      .from('reinforcements').select('title, schedule_type, status').eq('child_id', child.id).eq('status', 'active');
    const recentLogs = await this.logs.listByChild(child.id, { page: 1, pageSize: 10 });

    return await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(`Child Report — ${child.name}`, { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Date of birth: ${child.dateOfBirth}`);
      doc.text(`Age: ${child.age}`);
      doc.text(`Status: ${child.status}`);
      doc.text(`Specialists: ${child.specialists.map((s) => s.name).join(', ') || '—'}`);
      doc.text(`Teachers: ${child.teachers.map((s) => s.name).join(', ') || '—'}`);

      doc.moveDown().fontSize(16).text('Active Goals');
      doc.fontSize(12);
      for (const g of (goals.data ?? []) as { title: string }[]) doc.text(`• ${g.title}`);

      doc.moveDown().fontSize(16).text('Active Reinforcements');
      doc.fontSize(12);
      for (const r of (reinforcements.data ?? []) as { title: string; schedule_type: string }[]) {
        doc.text(`• ${r.title} (${r.schedule_type})`);
      }

      doc.moveDown().fontSize(16).text('Recent Behavior Logs');
      doc.fontSize(12);
      for (const log of recentLogs.data) {
        doc.text(`• ${log.occurredAt} — ${log.eventType}${log.notes ? `: ${log.notes}` : ''}`);
      }
      doc.end();
    });
  }
}
