import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { KidModeSessionDto } from '@kids/shared';

type Row = {
  id: string;
  child_id: string;
  opened_by: string;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
};

const toDto = (r: Row): KidModeSessionDto => ({
  id: r.id,
  childId: r.child_id,
  openedBy: r.opened_by,
  openedAt: r.opened_at,
  closedAt: r.closed_at,
  status: r.status,
});

@Injectable()
export class KidModeService {
  constructor(private readonly supabase: SupabaseService) {}

  async open(childId: string, openedBy: string): Promise<KidModeSessionDto> {
    // Close any other open sessions for this child first.
    await this.supabase.admin
      .from('kid_mode_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('child_id', childId)
      .eq('status', 'open');
    const { data, error } = await this.supabase.admin
      .from('kid_mode_sessions')
      .insert({ child_id: childId, opened_by: openedBy })
      .select('*').single();
    if (error) throw new BadRequestException(error.message);
    return toDto(data);
  }

  async close(sessionId: string): Promise<KidModeSessionDto> {
    const { data, error } = await this.supabase.admin
      .from('kid_mode_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return toDto(data);
  }

  async findOpenForChild(childId: string): Promise<KidModeSessionDto | null> {
    const { data, error } = await this.supabase.admin
      .from('kid_mode_sessions')
      .select('*')
      .eq('child_id', childId)
      .eq('status', 'open')
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return data ? toDto(data) : null;
  }
}
