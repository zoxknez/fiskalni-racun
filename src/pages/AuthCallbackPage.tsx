import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { toAuthUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { User } from '@/types'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { setUser } = useAppStore()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) throw error

        if (session?.user) {
          const authUser = toAuthUser(session.user)

          const nextUser: User = {
            id: authUser.id,
            email: authUser.email,
            createdAt: new Date(),
            ...(authUser.fullName !== undefined ? { fullName: authUser.fullName } : {}),
            ...(authUser.avatarUrl !== undefined ? { avatarUrl: authUser.avatarUrl } : {}),
          }

          setUser(nextUser)

          toast.success('Successfully signed in!')
          navigate('/')
        } else {
          navigate('/auth')
        }
      } catch (error) {
        logger.error('Auth callback error:', error)
        const message = error instanceof Error ? error.message : 'Authentication failed'
        toast.error(message)
        navigate('/auth')
      }
    }

    handleCallback()
  }, [navigate, setUser])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
        <p className="text-dark-600 dark:text-dark-400">Completing authentication...</p>
      </div>
    </div>
  )
}
