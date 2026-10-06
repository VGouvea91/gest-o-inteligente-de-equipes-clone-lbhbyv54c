import { useEffect, useState, useMemo, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Sparkles, Calendar as CalendarIcon, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const COLUMNS = [
  { id: 'todo', title: 'A Fazer' },
  { id: 'doing', title: 'Em Progresso' },
  { id: 'done', title: 'Concluído' },
]

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
}

const priorityLabel: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

// --- Sortable Task Card ---
function SortableTaskCard({
  task,
  onClick,
  justDraggedRef,
}: {
  task: RecordModel
  onClick: () => void
  justDraggedRef: React.RefObject<boolean>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const handleClick = () => {
    // So abre o modal se nao acabou de terminar um drag
    if (justDraggedRef.current) {
      justDraggedRef.current = false
      return
    }
    onClick()
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={handleClick}>
      <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <Badge
              variant="outline"
              className={`border-0 uppercase text-[10px] px-2 py-0.5 ${priorityColors[task.priority] || priorityColors.medium}`}
            >
              {priorityLabel[task.priority] || 'Média'}
            </Badge>
          </div>
          <h4 className="font-medium text-sm leading-tight mb-1">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {new Date(task.created).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })}
            </div>
            <Avatar className="h-6 w-6">
              <AvatarImage src={`https://img.usecurling.com/ppl/thumbnail?seed=${task.assignee}`} />
              <AvatarFallback className="text-[10px]">
                {task.expand?.assignee?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Static Task Card (for drag overlay) ---
function StaticTaskCard({ task }: { task: RecordModel }) {
  return (
    <Card className="cursor-grabbing shadow-xl rotate-2">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Badge
            variant="outline"
            className={`border-0 uppercase text-[10px] px-2 py-0.5 ${priorityColors[task.priority] || priorityColors.medium}`}
          >
            {priorityLabel[task.priority] || 'Média'}
          </Badge>
        </div>
        <h4 className="font-medium text-sm leading-tight mb-1">{task.title}</h4>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3 mr-1" />
            {new Date(task.created).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
          </div>
          <Avatar className="h-6 w-6">
            <AvatarImage src={`https://img.usecurling.com/ppl/thumbnail?seed=${task.assignee}`} />
            <AvatarFallback className="text-[10px]">
              {task.expand?.assignee?.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Droppable Column ---
function Column({
  column,
  tasks,
  onTaskClick,
  justDraggedRef,
}: {
  column: { id: string; title: string }
  tasks: RecordModel[]
  onTaskClick: (task: RecordModel) => void
  justDraggedRef: React.RefObject<boolean>
}) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  return (
    <div className="flex flex-col bg-slate-100/50 dark:bg-slate-900/50 rounded-xl p-4 overflow-hidden border min-h-[500px]">
      <div className="flex items-center justify-between mb-4 px-1 shrink-0">
        <h3 className="font-semibold">{column.title}</h3>
        <Badge variant="secondary" className="bg-white/50 dark:bg-slate-800/50">
          {tasks.length}
        </Badge>
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy} id={column.id}>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin min-h-[200px]">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              justDraggedRef={justDraggedRef}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
              Arraste tarefas para cá
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function Tasks() {
  const [tasks, setTasks] = useState<RecordModel[]>([])
  const [members, setMembers] = useState<RecordModel[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [activeTask, setActiveTask] = useState<RecordModel | null>(null)
  const [selectedTask, setSelectedTask] = useState<RecordModel | null>(null)
  const [editTask, setEditTask] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: '',
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const justDraggedRef = useRef(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: '',
  })
  const [isSuggesting, setIsSuggesting] = useState(false)
  const { isAdmin } = useAuth()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const loadData = async () => {
    try {
      const [t, m] = await Promise.all([
        pb.collection('tasks').getFullList({ expand: 'assignee', sort: '-created' }),
        pb.collection('members').getFullList({ expand: 'user' }),
      ])
      setTasks(t)
      setMembers(m)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('tasks', () => {
    if (!searchQuery) loadData()
  })

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return loadData()

    setIsSearching(true)
    try {
      const res = await pb.send('/backend/v1/search/tasks', {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery }),
      })
      setTasks(res.items.map((i: any) => ({ ...i, expand: i.expand || {} })))
    } catch (err) {
      toast({ title: 'Erro na busca', variant: 'destructive' })
    } finally {
      setIsSearching(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const teamId = members[0]?.team
      if (!teamId) throw new Error('Sem equipe')
      await pb.collection('tasks').create({ ...newTask, team: teamId })
      setIsTaskModalOpen(false)
      setNewTask({ title: '', description: '', status: 'todo', priority: 'medium', assignee: '' })
      toast({ title: 'Tarefa criada' })
    } catch (err) {
      toast({ title: 'Erro ao criar', variant: 'destructive' })
    }
  }

  const suggestAssignee = async () => {
    if (!newTask.title) {
      toast({ title: 'Digite o título primeiro', variant: 'destructive' })
      return
    }
    setIsSuggesting(true)
    try {
      const teamId = members[0]?.team
      const res = await pb.send('/backend/v1/tasks/suggest-assignee', {
        method: 'POST',
        body: JSON.stringify({ title: newTask.title, description: newTask.description, teamId }),
      })
      if (res.assignee) {
        setNewTask((p) => ({ ...p, assignee: res.assignee }))
        toast({ title: 'Responsável sugerido pela IA' })
      } else {
        toast({ title: 'IA não encontrou membro ideal' })
      }
    } catch (err) {
      toast({ title: 'Erro na sugestão IA', variant: 'destructive' })
    } finally {
      setIsSuggesting(false)
    }
  }

  const moveTask = async (taskId: string, newStatus: string) => {
    // Otimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    try {
      await pb.collection('tasks').update(taskId, { status: newStatus })
    } catch (err) {
      // Reverter em caso de erro
      console.error(err)
      toast({ title: 'Erro ao mover tarefa', variant: 'destructive' })
      loadData()
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    justDraggedRef.current = true

    if (!over) return

    const activeId = active.id as string
    const task = tasks.find((t) => t.id === activeId)
    if (!task) return

    // Determinar a coluna de destino
    // over.id pode ser o id de uma tarefa ou o id de uma coluna (SortableContext id)
    const overId = over.id as string
    const overTask = tasks.find((t) => t.id === overId)

    let newStatus: string
    if (overTask) {
      // Solto sobre outra tarefa — usa o status dela
      newStatus = overTask.status
    } else {
      // Solto sobre a coluna vazia ou area da coluna
      newStatus = overId
    }

    if (newStatus !== task.status) {
      moveTask(activeId, newStatus)
    }
  }

  const handleTaskClick = (task: RecordModel) => {
    setSelectedTask(task)
    setEditTask({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      assignee: task.assignee || '',
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return
    setIsSavingEdit(true)
    try {
      const updated = await pb.collection('tasks').update(selectedTask.id, {
        title: editTask.title,
        description: editTask.description,
        status: editTask.status,
        priority: editTask.priority,
        assignee: editTask.assignee || undefined,
      })
      setSelectedTask(null)
      toast({ title: 'Tarefa atualizada' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!selectedTask) return
    setIsSavingEdit(true)
    try {
      await pb.collection('tasks').delete(selectedTask.id)
      setSelectedTask(null)
      toast({ title: 'Tarefa excluída' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground mt-1">Gerencie fluxos e atividades da equipe.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Busca semântica IA..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
            />
          </form>
          <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Nova
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Tarefa</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(v) => setNewTask((p) => ({ ...p, priority: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={newTask.status}
                      onValueChange={(v) => setNewTask((p) => ({ ...p, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">A Fazer</SelectItem>
                        <SelectItem value="doing">Em Progresso</SelectItem>
                        <SelectItem value="done">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Responsável</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary"
                      onClick={suggestAssignee}
                      disabled={isSuggesting}
                    >
                      <Sparkles className="mr-1 h-3 w-3" /> IA Sugerir
                    </Button>
                  </div>
                  <Select
                    value={newTask.assignee}
                    onValueChange={(v) => setNewTask((p) => ({ ...p, assignee: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.expand?.user?.id} value={m.expand?.user?.id}>
                          {m.expand?.user?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Salvar Tarefa
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={tasks.filter((t) => t.status === col.id)}
              onTaskClick={handleTaskClick}
              justDraggedRef={justDraggedRef}
            />
          ))}
        </div>
        <DragOverlay>{activeTask ? <StaticTaskCard task={activeTask} /> : null}</DragOverlay>
      </DndContext>

      {/* Modal de detalhes da tarefa */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                required
                value={editTask.title}
                onChange={(e) => setEditTask((p) => ({ ...p, title: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editTask.description}
                onChange={(e) => setEditTask((p) => ({ ...p, description: e.target.value }))}
                disabled={!isAdmin}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={editTask.priority}
                  onValueChange={(v) => setEditTask((p) => ({ ...p, priority: v }))}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editTask.status}
                  onValueChange={(v) => setEditTask((p) => ({ ...p, status: v }))}
                  disabled={!isAdmin}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">A Fazer</SelectItem>
                    <SelectItem value="doing">Em Progresso</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={editTask.assignee}
                onValueChange={(v) => setEditTask((p) => ({ ...p, assignee: v }))}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.expand?.user?.id} value={m.expand?.user?.id}>
                      {m.expand?.user?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTask?.created && (
              <div className="flex items-center text-xs text-muted-foreground pt-2">
                <CalendarIcon className="h-3 w-3 mr-1" />
                Criada em{' '}
                {new Date(selectedTask.created).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            )}
            {isAdmin && (
              <div className="flex justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteTask}
                  disabled={isSavingEdit}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
