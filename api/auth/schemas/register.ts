// Zod schemas for register endpoint

import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  fullName: z.string().max(200).optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
