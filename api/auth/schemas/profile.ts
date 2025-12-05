// Zod schemas for profile update endpoint

import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z.string().max(200).optional(),
  avatarUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
