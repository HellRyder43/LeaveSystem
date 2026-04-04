import { z } from 'zod'

export const leaveRequestFormSchema = z
  .object({
    leave_type_id: z.string().min(1, 'Please select a leave type.'),
    start_date: z.string().min(1, 'Start date is required.'),
    end_date: z.string().min(1, 'End date is required.'),
    duration_modifier: z.enum(['Full', 'First Half', 'Second Half']),
    reason: z.string().optional(),
    covering_employee_id: z.string().optional(),
    notes: z.string().max(500, 'Notes cannot exceed 500 characters.').optional(),
  })
  .refine(
    (data) => !data.start_date || !data.end_date || data.start_date <= data.end_date,
    { message: 'End date must be on or after start date.', path: ['end_date'] }
  )
  .refine(
    (data) => {
      if (data.duration_modifier === 'First Half' || data.duration_modifier === 'Second Half') {
        return data.start_date === data.end_date
      }
      return true
    },
    { message: 'Half-day leave can only be applied for a single day.', path: ['duration_modifier'] }
  )

export type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>
