import { Loader2 } from 'lucide-react'

export function LoadingScreen() {
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
