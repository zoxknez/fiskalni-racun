import { useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { toAuthUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

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

          setUser({
            id: authUser.id,
            email: authUser.email,
            fullName: authUser.fullName,
            avatarUrl: authUser.avatarUrl,
            createdAt: new Date(),
          })

          toast.success('Successfully signed in!')
          navigate('/')
        } else {
          navigate('/auth')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        const message = error instanceof Error ? error.message : 'Authentication failed'
        toast.error(message)
        navigate('/auth')
      }
    }

    handleCallback()
  }, [navigate, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-dark-600 dark:text-dark-400">Completing authentication...</p>
      </div>
    </div>
  )
}
