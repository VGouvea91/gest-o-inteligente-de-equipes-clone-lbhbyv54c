import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    const { error } = await updateProfile({ name })
    setIsLoading(false)
    if (error) toast({ title: 'Erro ao salvar', variant: 'destructive' })
    else toast({ title: 'Perfil atualizado' })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas preferências e perfil pessoal.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Atualize suas informações visíveis para a equipe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border">
              <AvatarImage src={`https://img.usecurling.com/ppl/large?seed=${user?.id}`} />
              <AvatarFallback className="text-2xl">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <Button variant="outline">Alterar Foto</Button>
          </div>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
            </div>
            <Button onClick={handleSave} disabled={isLoading || name === user?.name}>
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
