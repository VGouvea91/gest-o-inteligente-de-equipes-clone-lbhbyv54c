import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Loader2, Lock } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function SetupPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialEmail = (location.state as { email?: string })?.email || ''
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'Mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: 'Senhas não coincidem', variant: 'destructive' })
      return
    }
    setIsLoading(true)
    try {
      const res = await pb.send('/backend/v1/setup-password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (res.success) {
        toast({ title: 'Senha definida!', description: 'Faça login para continuar.' })
        navigate('/login', { state: { email }, replace: true })
      } else {
        toast({ title: 'Erro', description: res.error, variant: 'destructive' })
      }
    } catch (err: any) {
      const msg = err?.response?.message || 'Erro ao definir senha.'
      toast({ title: 'Erro', description: msg, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-elevation border-0">
        <CardHeader className="space-y-1">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 mx-auto">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Definir sua senha</CardTitle>
          <CardDescription className="text-center">
            Este é seu primeiro acesso. Crie uma senha para sua conta.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="m@exemplo.com"
                disabled={!!initialEmail}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Definir Senha e Continuar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
