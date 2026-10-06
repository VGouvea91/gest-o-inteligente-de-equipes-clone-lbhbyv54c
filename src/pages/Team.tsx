import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Plus, Mail, Pencil, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

export default function Team() {
  const { user: currentUser } = useAuth()
  const [members, setMembers] = useState<RecordModel[]>([])
  const [selectedMember, setSelectedMember] = useState<RecordModel | null>(null)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'member' })
  const [isInviting, setIsInviting] = useState(false)

  // Edicao
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editMember, setEditMember] = useState<RecordModel | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'member' })
  const [isSaving, setIsSaving] = useState(false)

  // Remocao
  const [deleteMember, setDeleteMember] = useState<RecordModel | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadMembers = async (): Promise<RecordModel[]> => {
    try {
      const records = await pb.collection('members').getFullList({ expand: 'user,team' })
      setMembers(records)
      return records
    } catch (err) {
      console.error(err)
      return []
    }
  }

  useEffect(() => {
    loadMembers()
  }, [])
  useRealtime('members', () => loadMembers())

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsInviting(true)
    try {
      let teamId = members[0]?.team
      if (!teamId) {
        try {
          const myMemberships = await pb.collection('members').getFullList({
            filter: pb.filter('user = {:userId}', { userId: pb.authStore.record?.id }),
          })
          teamId = myMemberships[0]?.team
        } catch (err) {
          console.error('Falha ao buscar memberships do usuario', err)
        }
      }
      if (!teamId) {
        toast({ title: 'Nenhuma equipe encontrada', variant: 'destructive' })
        return
      }

      const res = await pb.send('/backend/v1/add-member', {
        method: 'POST',
        body: JSON.stringify({
          email: newMember.email,
          name: newMember.name,
          teamId,
          role: newMember.role,
        }),
      })

      if (res.alreadyMember) {
        toast({
          title: 'Usuário já é membro',
          description: `${newMember.email} já pertence à equipe.`,
        })
        return
      }

      toast({
        title: 'Funcionário adicionado!',
        description: `${newMember.name} foi cadastrado. Ao fazer login pela primeira vez, deverá criar sua senha.`,
      })
      setIsInviteOpen(false)
      setNewMember({ name: '', email: '', role: 'member' })
      loadMembers()
    } catch (err) {
      toast({
        title: 'Erro ao adicionar funcionário',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsInviting(false)
    }
  }

  const openEditDialog = (member: RecordModel) => {
    const u = member.expand?.user
    setEditMember(member)
    setEditForm({
      name: u?.name || '',
      email: u?.email || '',
      role: member.role || 'member',
    })
    setIsEditOpen(true)
  }

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editMember) return
    setIsSaving(true)
    try {
      const res = await pb.send('/backend/v1/update-member', {
        method: 'POST',
        body: JSON.stringify({
          memberId: editMember.id,
          name: editForm.name,
          email: editForm.email,
          role: editForm.role,
        }),
      })
      if (res.error) {
        toast({ title: 'Erro ao editar', description: res.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Funcionário atualizado!' })
      setIsEditOpen(false)
      setEditMember(null)
      const refreshed = await loadMembers()
      // Atualiza o painel lateral com os dados frescos do membro editado
      if (selectedMember) {
        const updated = refreshed.find((m) => m.id === selectedMember.id)
        if (updated) setSelectedMember(updated)
      }
    } catch (err: any) {
      const msg = err?.response?.message || 'Verifique os dados e tente novamente.'
      toast({ title: 'Erro ao editar funcionário', description: msg, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMember = async () => {
    if (!deleteMember) return
    setIsDeleting(true)
    try {
      const res = await pb.send('/backend/v1/delete-member', {
        method: 'POST',
        body: JSON.stringify({ memberId: deleteMember.id }),
      })
      if (res.error) {
        toast({ title: 'Erro ao remover', description: res.error, variant: 'destructive' })
        return
      }
      toast({
        title: 'Funcionário removido',
        description: res.userDeleted
          ? 'O usuário foi removido da equipe e do sistema.'
          : 'O usuário foi removido da equipe.',
      })
      setDeleteMember(null)
      setSelectedMember(null)
      loadMembers()
    } catch (err: any) {
      const msg = err?.response?.message || 'Tente novamente.'
      toast({ title: 'Erro ao remover funcionário', description: msg, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const statusColors = {
    online: 'bg-emerald-500',
    away: 'bg-amber-500',
    busy: 'bg-rose-500',
    offline: 'bg-slate-300',
  }

  const isSelf = (member: RecordModel) =>
    member.expand?.user?.id === currentUser?.id || member.user === currentUser?.id

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe</h1>
          <p className="text-muted-foreground mt-1">Gerencie os membros e visualize métricas.</p>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Funcionário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  required
                  value={newMember.name}
                  onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do funcionário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={newMember.email}
                  onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select
                  value={newMember.role}
                  onValueChange={(v) => setNewMember((p) => ({ ...p, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Funcionário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
                O funcionário deverá criar sua senha no primeiro acesso à plataforma.
              </div>
              <Button type="submit" className="w-full" disabled={isInviting}>
                {isInviting ? 'Adicionando...' : 'Adicionar Funcionário'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {members.map((member) => {
          const user = member.expand?.user
          return (
            <Card
              key={member.id}
              className="cursor-pointer hover:shadow-md transition-all group overflow-hidden"
              onClick={() => setSelectedMember(member)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-sm">
                    <AvatarImage
                      src={`https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`}
                    />
                    <AvatarFallback className="text-lg">
                      {user?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-background ${statusColors[member.status as keyof typeof statusColors] || statusColors.offline}`}
                  />
                </div>
                <h3 className="font-semibold text-lg truncate w-full">
                  {user?.name || user?.email}
                </h3>
                <p className="text-sm text-muted-foreground capitalize mb-3">{member.role}</p>
                <Badge variant="secondary" className="font-normal">
                  {member.status === 'online'
                    ? 'Trabalhando'
                    : member.status === 'busy'
                      ? 'Ocupado'
                      : 'Ausente'}
                </Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Sheet de detalhes com acoes de editar/remover */}
      <Sheet open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-6 border-b">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={`https://img.usecurling.com/ppl/thumbnail?seed=${selectedMember?.expand?.user?.id}`}
                />
                <AvatarFallback>{selectedMember?.expand?.user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-xl">{selectedMember?.expand?.user?.name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <Mail className="h-3 w-3" /> {selectedMember?.expand?.user?.email}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="py-6 space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
                Métricas
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">12</div>
                  <div className="text-xs text-muted-foreground">Tarefas Concluídas</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-xs text-muted-foreground">Em Andamento</div>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
                Feedback Recente
              </h4>
              <Card className="bg-emerald-50 border-emerald-100 shadow-none">
                <CardContent className="p-4 text-sm text-emerald-800">
                  "Ótimo trabalho na entrega da feature de autenticação! O código ficou muito
                  limpo."
                  <div className="mt-2 text-xs opacity-70">- Gestor-IA</div>
                </CardContent>
              </Card>
            </div>
          </div>
          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => selectedMember && openEditDialog(selectedMember)}
              disabled={!selectedMember || isSelf(selectedMember)}
            >
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => setDeleteMember(selectedMember)}
              disabled={!selectedMember || isSelf(selectedMember)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remover
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dialog de edicao */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditMember} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                required
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome do funcionário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Função</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((p) => ({ ...p, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Funcionário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmacao de remocao */}
      <AlertDialog open={!!deleteMember} onOpenChange={(open) => !open && setDeleteMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>{deleteMember?.expand?.user?.name}</strong> da equipe. Se o
              usuário não pertencer a nenhuma outra equipe, sua conta também será excluída do
              sistema. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Removendo...' : 'Sim, remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
