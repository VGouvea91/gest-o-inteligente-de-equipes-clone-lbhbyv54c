import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
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
import { Loader2 } from 'lucide-react'

const stagger = (i: number) => ({ animationDelay: `${i * 120}ms` })

export default function Login() {
  const [email, setEmail] = useState('felipe.lemos@adapta.org')
  const [password, setPassword] = useState('Skip@Pass')
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const { signIn, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading) {
      const timer = setTimeout(() => setInitialLoading(false), 400)
      return () => clearTimeout(timer)
    }
  }, [authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const { error } = await signIn(email, password)
    setIsLoading(false)
    if (error) {
      if (error.needsPasswordSetup) {
        navigate('/setup-password', { state: { email }, replace: true })
        return
      }
      toast({
        title: 'Erro ao entrar',
        description: 'Verifique suas credenciais.',
        variant: 'destructive',
      })
    } else {
      navigate('/')
    }
  }

  if (initialLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-background gap-6 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-3xl">G</span>
          </div>
          <div className="absolute -inset-2 rounded-2xl border-2 border-primary/20 animate-ping" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background p-4 animate-fade-in">
      <Card className="w-full max-w-md shadow-elevation border-0 animate-fade-in-up">
        <CardHeader className="space-y-1 animate-fade-in" style={stagger(0)}>
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 mx-auto">
            <span className="text-primary-foreground font-bold text-2xl">G</span>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Bem-vindo de volta</CardTitle>
          <CardDescription className="text-center">
            Entre com seu email para acessar o sistema
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 animate-fade-in" style={stagger(1)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="m@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 animate-fade-in" style={stagger(2)}>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Não tem uma conta?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Cadastre-se
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
