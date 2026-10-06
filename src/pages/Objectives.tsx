import { useEffect, useState } from 'react'
import { RecordModel } from 'pocketbase'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getObjectives,
  createObjective,
  updateObjective,
  getKeyResults,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
} from '@/services/objectives'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Target, Plus, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export default function Objectives() {
  const [objectives, setObjectives] = useState<RecordModel[]>([])
  const [members, setMembers] = useState<RecordModel[]>([])
  const [keyResultsMap, setKeyResultsMap] = useState<Record<string, RecordModel[]>>({})
  const [isObjModalOpen, setIsObjModalOpen] = useState(false)
  const [newObj, setNewObj] = useState({
    title: '',
    description: '',
    status: 'active',
  })

  const loadData = async () => {
    try {
      const [objs, members] = await Promise.all([
        getObjectives(),
        pb.collection('members').getFullList({ expand: 'user' }),
      ])
      setObjectives(objs)
      setMembers(members)

      const krMap: Record<string, RecordModel[]> = {}
      for (const obj of objs) {
        krMap[obj.id] = await getKeyResults(obj.id)
      }
      setKeyResultsMap(krMap)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('objectives', () => loadData())
  useRealtime('key_results', () => loadData())

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const teamId = members[0]?.team
      const ownerId = members.find((m) => m.role === 'admin')?.user || members[0]?.user
      if (!teamId || !ownerId) throw new Error('Sem equipe')
      await createObjective({ ...newObj, team: teamId, owner: ownerId })
      setIsObjModalOpen(false)
      setNewObj({ title: '', description: '', status: 'active' })
      toast({ title: 'Objetivo criado!' })
    } catch (err) {
      toast({ title: 'Erro ao criar objetivo', variant: 'destructive' })
    }
  }

  const handleAddKR = async (
    objectiveId: string,
    description: string,
    target: number,
    unit: string,
  ) => {
    try {
      await createKeyResult({
        objective: objectiveId,
        description,
        target,
        current: 0,
        unit,
        status: 'on_track',
      })
      toast({ title: 'Key Result adicionado!' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao adicionar KR', variant: 'destructive' })
    }
  }

  const handleUpdateKRProgress = async (krId: string, current: number, target: number) => {
    try {
      const progress = target > 0 ? Math.round((current / target) * 100) : 0
      let status = 'on_track'
      if (progress >= 100) status = 'completed'
      else if (progress < 60) status = 'off_track'
      else if (progress < 80) status = 'at_risk'
      await updateKeyResult(krId, { current, status })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao atualizar KR', variant: 'destructive' })
    }
  }

  const statusConfig = {
    on_track: { label: 'No Caminho', variant: 'success' as const, icon: CheckCircle2 },
    at_risk: { label: 'Em Risco', variant: 'warning' as const, icon: TrendingUp },
    off_track: { label: 'Fora do Caminho', variant: 'destructive' as const, icon: AlertTriangle },
    completed: { label: 'Concluído', variant: 'default' as const, icon: CheckCircle2 },
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Objetivos & OKRs</h1>
          <p className="text-muted-foreground mt-1">
            Defina metas estratégicas e acompanhe os resultados-chave da equipe.
          </p>
        </div>
        <Dialog open={isObjModalOpen} onOpenChange={setIsObjModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Objetivo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Objetivo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateObjective} className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  required
                  value={newObj.title}
                  onChange={(e) => setNewObj((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Aumentar produtividade em 30%"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={newObj.description}
                  onChange={(e) => setNewObj((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descreva o objetivo estratégico..."
                />
              </div>
              <Button type="submit" className="w-full">
                Criar Objetivo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {objectives.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum objetivo definido ainda. Crie o primeiro objetivo estratégico da sua equipe!
            </p>
          </CardContent>
        </Card>
      )}

      {objectives.map((obj) => {
        const krs = keyResultsMap[obj.id] || []
        const avgProgress =
          krs.length > 0
            ? Math.round(
                krs.reduce((acc, kr) => {
                  const p = kr.target > 0 ? (kr.current / kr.target) * 100 : 0
                  return acc + Math.min(p, 100)
                }, 0) / krs.length,
              )
            : obj.progress || 0

        return (
          <ObjectiveCard
            key={obj.id}
            objective={obj}
            keyResults={krs}
            avgProgress={avgProgress}
            statusConfig={statusConfig}
            onAddKR={handleAddKR}
            onUpdateKR={handleUpdateKRProgress}
            onDeleteKR={async (id) => {
              try {
                await deleteKeyResult(id)
                toast({ title: 'Key Result removido' })
                loadData()
              } catch (err) {
                toast({ title: 'Erro ao remover KR', variant: 'destructive' })
              }
            }}
          />
        )
      })}
    </div>
  )
}

function ObjectiveCard({
  objective,
  keyResults,
  avgProgress,
  statusConfig,
  onAddKR,
  onUpdateKR,
  onDeleteKR,
}: {
  objective: RecordModel
  keyResults: RecordModel[]
  avgProgress: number
  statusConfig: any
  onAddKR: (objId: string, desc: string, target: number, unit: string) => void
  onUpdateKR: (krId: string, current: number, target: number) => void
  onDeleteKR: (id: string) => void
}) {
  const [isKRModalOpen, setIsKRModalOpen] = useState(false)
  const [newKR, setNewKR] = useState({ description: '', target: 0, unit: '' })

  const handleSubmitKR = (e: React.FormEvent) => {
    e.preventDefault()
    onAddKR(objective.id, newKR.description, newKR.target, newKR.unit)
    setNewKR({ description: '', target: 0, unit: '' })
    setIsKRModalOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl">{objective.title}</CardTitle>
            {objective.description && (
              <p className="text-sm text-muted-foreground mt-1">{objective.description}</p>
            )}
          </div>
          <Badge variant={objective.status === 'active' ? 'default' : 'secondary'}>
            {objective.status === 'active'
              ? 'Ativo'
              : objective.status === 'completed'
                ? 'Concluído'
                : 'Arquivado'}
          </Badge>
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm font-bold text-primary">{avgProgress}%</span>
          </div>
          <Progress value={avgProgress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {keyResults.map((kr) => {
            const krProgress = kr.target > 0 ? Math.min((kr.current / kr.target) * 100, 100) : 0
            const config = statusConfig[kr.status] || statusConfig.on_track
            const Icon = config.icon
            return (
              <div
                key={kr.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-slate-50/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{kr.description}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Progress value={krProgress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {kr.current}/{kr.target} {kr.unit}
                    </span>
                  </div>
                </div>
                <Badge variant={config.variant} className="text-xs">
                  {config.label}
                </Badge>
                <Input
                  type="number"
                  className="w-20 h-8 text-xs"
                  value={kr.current}
                  onChange={(e) => onUpdateKR(kr.id, Number(e.target.value), kr.target)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive"
                  onClick={() => onDeleteKR(kr.id)}
                >
                  ✕
                </Button>
              </div>
            )
          })}

          <Dialog open={isKRModalOpen} onOpenChange={setIsKRModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="mr-2 h-3 w-3" /> Adicionar Key Result
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Key Result</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitKR} className="space-y-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    required
                    value={newKR.description}
                    onChange={(e) => setNewKR((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Ex: Tarefas concluídas por sprint"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meta</Label>
                    <Input
                      type="number"
                      required
                      value={newKR.target || ''}
                      onChange={(e) => setNewKR((p) => ({ ...p, target: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Input
                      value={newKR.unit}
                      onChange={(e) => setNewKR((p) => ({ ...p, unit: e.target.value }))}
                      placeholder="Ex: tarefas, dias, %"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Adicionar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
