import { z } from 'zod';
import {
  ASSIGNMENT_TYPES,
  NOTE_VISIBILITIES,
  REINFORCEMENT_SCHEDULE_TYPES,
  STAFF_ROLES,
  TASK_STATUSES,
  USER_STATUSES,
} from './constants';

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------
export const phoneSchema = z
  .string()
  .regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits');

export const emailSchema = z.string().email('Invalid email address');

export const nameSchema = z.string().trim().min(1, 'Name is required').max(120);

export const uuidSchema = z.string().uuid();

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

// ---------------------------------------------------------------------------
// Pagination / list query
// ---------------------------------------------------------------------------
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
  status: z.enum(USER_STATUSES).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

// ---------------------------------------------------------------------------
// Users (staff)
// ---------------------------------------------------------------------------
export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  role: z.enum(STAFF_ROLES),
  status: z.enum(USER_STATUSES).default('active'),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  role: z.enum(STAFF_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ---------------------------------------------------------------------------
// Parents
// ---------------------------------------------------------------------------
export const createParentSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  status: z.enum(USER_STATUSES).default('active'),
});
export type CreateParentInput = z.infer<typeof createParentSchema>;

export const updateParentSchema = createParentSchema.partial();
export type UpdateParentInput = z.infer<typeof updateParentSchema>;

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------
export const createChildSchema = z.object({
  name: nameSchema,
  dateOfBirth: isoDateSchema,
  notes: z.string().max(2000).optional().nullable(),
  specialistIds: z.array(uuidSchema).default([]),
  teacherIds: z.array(uuidSchema).default([]),
  parentIds: z.array(uuidSchema).default([]),
  status: z.enum(USER_STATUSES).default('active'),
});
export type CreateChildInput = z.infer<typeof createChildSchema>;

export const updateChildSchema = createChildSchema.partial();
export type UpdateChildInput = z.infer<typeof updateChildSchema>;

export const assignmentSchema = z.object({
  childId: uuidSchema,
  assigneeId: uuidSchema,
  type: z.enum(ASSIGNMENT_TYPES),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export const createGoalSchema = z.object({
  childId: uuidSchema,
  title: nameSchema,
  description: z.string().max(2000).optional().nullable(),
  target: z.string().max(500).optional().nullable(),
  status: z.enum(USER_STATUSES).default('active'),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export const updateGoalSchema = createGoalSchema.partial();
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

// ---------------------------------------------------------------------------
// Reinforcements
// ---------------------------------------------------------------------------
export const createReinforcementSchema = z
  .object({
    childId: uuidSchema,
    title: nameSchema,
    description: z.string().max(2000).optional().nullable(),
    scheduleType: z.enum(REINFORCEMENT_SCHEDULE_TYPES),
    vrMin: z.number().int().min(1).optional().nullable(),
    vrMax: z.number().int().min(1).optional().nullable(),
    status: z.enum(USER_STATUSES).default('active'),
  })
  .superRefine((val, ctx) => {
    if (val.scheduleType === 'variable_ratio') {
      if (val.vrMin == null || val.vrMax == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'vrMin and vrMax required for variable_ratio',
          path: ['scheduleType'],
        });
      } else if (val.vrMin > val.vrMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'vrMin must be <= vrMax',
          path: ['vrMin'],
        });
      }
    }
  });
export type CreateReinforcementInput = z.infer<typeof createReinforcementSchema>;

// ---------------------------------------------------------------------------
// Behavior logs
// ---------------------------------------------------------------------------
export const createBehaviorLogSchema = z.object({
  childId: uuidSchema,
  occurredAt: z.string().datetime().optional(),
  eventType: z.string().trim().min(1).max(120),
  response: z.string().max(500).optional().nullable(),
  promptLevel: z.string().max(120).optional().nullable(),
  intensity: z.string().max(120).optional().nullable(),
  durationSec: z.number().int().min(0).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateBehaviorLogInput = z.infer<typeof createBehaviorLogSchema>;

// ---------------------------------------------------------------------------
// Parent tasks
// ---------------------------------------------------------------------------
export const createParentTaskSchema = z.object({
  childId: uuidSchema,
  parentId: uuidSchema,
  title: nameSchema,
  description: z.string().max(2000).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  taskStatus: z.enum(TASK_STATUSES).default('pending'),
  status: z.enum(USER_STATUSES).default('active'),
});
export type CreateParentTaskInput = z.infer<typeof createParentTaskSchema>;
export const updateParentTaskSchema = createParentTaskSchema.partial();
export type UpdateParentTaskInput = z.infer<typeof updateParentTaskSchema>;

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export const createNoteSchema = z.object({
  childId: uuidSchema,
  title: nameSchema,
  body: z.string().trim().min(1).max(8000),
  visibility: z.enum(NOTE_VISIBILITIES).default('staff'),
  status: z.enum(USER_STATUSES).default('active'),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export const updateNoteSchema = createNoteSchema.partial();
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;

// ---------------------------------------------------------------------------
// Kid Mode
// ---------------------------------------------------------------------------
export const openKidModeSchema = z.object({
  childId: uuidSchema,
});

// ---------------------------------------------------------------------------
// Parent invitation
// ---------------------------------------------------------------------------
export const inviteParentSchema = z.object({
  password: z.string().min(8).max(128).optional(),
});
export type InviteParentInput = z.infer<typeof inviteParentSchema>;

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------
export const forgotVerifySchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
});
export type ForgotVerifyInput = z.infer<typeof forgotVerifySchema>;

export const forgotResetSchema = z.object({
  token: z.string().uuid('Invalid reset token'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type ForgotResetInput = z.infer<typeof forgotResetSchema>;
