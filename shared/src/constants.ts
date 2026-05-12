export const STAFF_ROLES = ['admin', 'specialist', 'teacher'] as const;
export const ALL_ROLES = ['admin', 'specialist', 'teacher', 'parent'] as const;

export const USER_STATUSES = ['active', 'inactive'] as const;
export const NOTE_VISIBILITIES = ['staff', 'parent'] as const;
export const ASSIGNMENT_TYPES = ['specialist', 'teacher', 'parent'] as const;
export const REINFORCEMENT_SCHEDULE_TYPES = ['continuous', 'variable_ratio'] as const;
export const TASK_STATUSES = ['pending', 'in_progress', 'done', 'cancelled'] as const;
export const KID_MODE_STATUSES = ['open', 'closed'] as const;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
