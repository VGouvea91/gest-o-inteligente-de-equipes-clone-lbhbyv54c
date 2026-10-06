import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

interface AuthContextType {
  user: RecordModel | null
  isAuthenticated: boolean
  isAdmin: boolean
  role: string
  needsPasswordSetup: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  requestPasswordReset: (email: string) => Promise<{ error: any }>
  confirmPasswordReset: (token: string, password: string) => Promise<{ error: any }>
  requestEmailChange: (newEmail: string) => Promise<{ error: any }>
  confirmEmailChange: (token: string, password: string) => Promise<{ error: any }>
  updateProfile: (data: { name?: string; avatar?: File | null }) => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<RecordModel | null>(
    pb.authStore.isValid ? pb.authStore.record : null,
  )
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? record : null)
      setIsAuthenticated(pb.authStore.isValid)
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }
    return () => {
      unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    try {
      await pb.collection('users').create({ email, password, passwordConfirm: password, name })
      try {
        await pb.collection('users').requestVerification(email)
      } catch {
        /* best effort */
      }
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error: any) {
      // Se credenciais invalidas, verificar se o usuario precisa definir senha
      if (error?.status === 400 && email) {
        try {
          const res = await pb.send('/backend/v1/check-setup-status', {
            method: 'POST',
            body: JSON.stringify({ email }),
          })
          if (res.needsPasswordSetup) {
            return { error: { needsPasswordSetup: true, email } }
          }
        } catch (_) {
          // ignorar — retorna erro original
        }
      }
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const requestEmailChange = async (newEmail: string) => {
    try {
      await pb.collection('users').requestEmailChange(newEmail)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const confirmEmailChange = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmEmailChange(token, password)
      pb.authStore.clear()
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const updateProfile = async (data: { name?: string; avatar?: File | null }) => {
    try {
      if (user) {
        let updated
        if (data.avatar) {
          const formData = new FormData()
          if (data.name !== undefined) formData.append('name', data.name)
          formData.append('avatar', data.avatar)
          updated = await pb.collection('users').update(user.id, formData)
        } else {
          const updateData: Record<string, string> = {}
          if (data.name !== undefined) updateData.name = data.name
          updated = await pb.collection('users').update(user.id, updateData)
        }
        setUser(updated)
      }
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin: user?.role === 'admin',
        role: user?.role || 'member',
        needsPasswordSetup: user?.needs_password_setup ?? false,
        signUp,
        signIn,
        signOut,
        requestPasswordReset,
        confirmPasswordReset,
        requestEmailChange,
        confirmEmailChange,
        updateProfile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
