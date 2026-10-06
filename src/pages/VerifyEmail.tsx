import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    pb.collection('users')
      .confirmVerification(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Verificação de Email</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Aguarde enquanto verificamos seu email...'}
            {status === 'success' && 'Seu email foi verificado com sucesso!'}
            {status === 'error' && 'Link inválido ou expirado.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(status === 'success' || status === 'error') && (
            <Button asChild className="w-full">
              <Link to="/login">Voltar para o Login</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
