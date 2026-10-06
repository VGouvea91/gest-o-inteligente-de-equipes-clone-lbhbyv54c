import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { getAvatarUrl } from '@/lib/avatar'
import { useRealtime } from '@/hooks/use-realtime'
import { Camera, Mail, Shield, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(user?.name || '')
  }, [user?.name])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const refreshFromDb = async () => {
    if (!user) return
    try {
      const fresh = await pb.collection('users').getOne(user.id)
      setName(fresh.name || '')
    } catch {
      /* ignore */
    }
  }

  useRealtime('users', (e) => {
    if (e.record.id === user?.id) {
      refreshFromDb()
    }
  })

  const currentAvatar = avatarPreview || getAvatarUrl(user, 'large')
  const roleLabel =
    user?.role === 'admin' ? 'Administrador' : user?.role === 'manager' ? 'Gerente' : 'Funcionário'
  const roleVariant: 'destructive' | 'default' | 'secondary' =
    user?.role === 'admin' ? 'destructive' : user?.role === 'manager' ? 'default' : 'secondary'

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem.',
        variant: 'destructive',
      })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB.', variant: 'destructive' })
      return
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    setIsLoading(true)
    const data: { name?: string; avatar?: File | null } = {}
    if (name !== user?.name) data.name = name
    if (avatarFile) data.avatar = avatarFile

    if (!data.name && !data.avatar) {
      toast({ title: 'Nenhuma alteração para salvar' })
      setIsLoading(false)
      return
    }

    const { error } = await updateProfile(data)
    setIsLoading(false)
    if (error) {
      toast({ title: 'Erro ao salvar', description: 'Tente novamente.', variant: 'destructive' })
    } else {
      toast({ title: 'Perfil atualizado com sucesso!' })
      setAvatarFile(null)
      setAvatarPreview(null)
    }
  }

  const hasChanges = name !== user?.name || avatarFile !== null
  const memberSince = user?.created
    ? format(new Date(user.created), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : ''

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Visualize e atualize seus dados de perfil.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                <AvatarImage src={currentAvatar} />
                <AvatarFallback className="text-3xl">{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-7 w-7 text-white" />
              </div>
            </div>
            <div className="flex flex-col gap-2 items-center sm:items-start">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" /> Alterar Foto
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máx 5MB.</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="space-y-2 max-w-md">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2 max-w-md">
            <Label>Email</Label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-muted border border-border">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{user?.email}</span>
            </div>
          </div>

          <div className="space-y-2 max-w-md">
            <Label>Função</Label>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Badge variant={roleVariant}>{roleLabel}</Badge>
            </div>
          </div>

          {memberSince && (
            <div className="space-y-2 max-w-md">
              <Label>Membro desde</Label>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground capitalize">{memberSince}</span>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
