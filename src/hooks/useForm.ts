/**
 * Custom Form Hook
 *
 * Wrapper around React Hook Form with Zod validation
 *
 * @module hooks/useForm
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { type FieldValues, type UseFormProps, useForm as useHookForm } from 'react-hook-form'
import type { ZodTypeAny } from 'zod'

/**
 * Enhanced useForm with Zod validation
 *
 * @example
 * ```tsx
 * const form = useForm({
 *   schema: signInSchema,
 *   defaultValues: { email: '', password: '' }
 * })
 *
 * <form onSubmit={form.handleSubmit(onSubmit)}>
 *   <input {...form.register('email')} />
 *   {form.errors.email && <span>{form.errors.email.message}</span>}
 * </form>
 * ```
 */
export function useForm({
  schema,
  ...options
}: UseFormProps<FieldValues> & {
  schema: ZodTypeAny
}) {
  const resolver = zodResolver(schema as never) as NonNullable<
    UseFormProps<FieldValues>['resolver']
  >

  return useHookForm<FieldValues>({
    ...options,
    resolver,
    mode: options.mode || 'onBlur',
  })
}
