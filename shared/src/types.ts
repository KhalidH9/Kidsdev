import type {
  ALL_ROLES,
  ASSIGNMENT_TYPES,
  KID_MODE_STATUSES,
  NOTE_VISIBILITIES,
  REINFORCEMENT_SCHEDULE_TYPES,
  STAFF_ROLES,
  TASK_STATUSES,
  USER_STATUSES,
} from './constants';

export type Role = (typeof ALL_ROLES)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type NoteVisibility = (typeof NOTE_VISIBILITIES)[number];
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];
export type ReinforcementScheduleType = (typeof REINFORCEMENT_SCHEDULE_TYPES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type KidModeStatus = (typeof KID_MODE_STATUSES)[number];

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuditMeta {
  createdAt: string;
  updatedAt: string;
}

export interface UserDto extends AuditMeta {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: UserStatus;
}

export interface ParentDto extends AuditMeta {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
}

export interface ChildAssigneeRef {
  id: string;
  name: string;
  role: AssignmentType;
}

export interface ChildDto extends AuditMeta {
  id: string;
  schoolId: string;
  name: string;
  dateOfBirth: string;          // ISO date (YYYY-MM-DD)
  age: string;                  // formatted YY-MM-DD
  notes: string | null;
  status: UserStatus;
  specialists: ChildAssigneeRef[];
  teachers: ChildAssigneeRef[];
  parents: ChildAssigneeRef[];
}

export interface GoalDto extends AuditMeta {
  id: string;
  childId: string;
  title: string;
  description: string | null;
  target: string | null;
  status: UserStatus;
}

export interface ReinforcementDto extends AuditMeta {
  id: string;
  childId: string;
  title: string;
  description: string | null;
  scheduleType: ReinforcementScheduleType;
  vrMin: number | null;
  vrMax: number | null;
  status: UserStatus;
}

export interface BehaviorLogDto {
  id: string;
  childId: string;
  teacherId: string;
  occurredAt: string;
  eventType: string;
  response: string | null;
  promptLevel: string | null;
  intensity: string | null;
  durationSec: number | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ParentTaskDto extends AuditMeta {
  id: string;
  childId: string;
  parentId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  taskStatus: TaskStatus;
  status: UserStatus;
}

export interface NoteDto extends AuditMeta {
  id: string;
  childId: string;
  title: string;
  body: string;
  visibility: NoteVisibility;
  status: UserStatus;
}

export interface KidModeSessionDto {
  id: string;
  childId: string;
  openedBy: string;
  openedAt: string;
  closedAt: string | null;
  status: KidModeStatus;
}

export interface AuditLogDto {
  id: string;
  schoolId: string | null;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SessionUserDto {
  id: string;
  email: string;
  profile: UserDto | null;
}

export interface DashboardStat {
  key: string;
  label: string;
  value: number;
}

export interface DashboardRecentLog {
  id: string;
  childId: string;
  childName: string;
  eventType: string;
  occurredAt: string;
  notes: string | null;
}

export interface DashboardSummaryDto {
  schoolName: string;
  stats: DashboardStat[];
  recentLogs: DashboardRecentLog[];
}
