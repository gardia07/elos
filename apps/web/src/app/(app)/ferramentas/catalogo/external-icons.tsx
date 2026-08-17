import type { CSSProperties } from 'react';
import {
  Banknote,
  Briefcase,
  BookOpen,
  Calculator,
  Calendar,
  CalendarDays,
  Camera,
  CheckSquare,
  Cloud,
  FileText,
  HardDrive,
  Kanban,
  Landmark,
  Link as LinkIcon,
  NotebookPen,
  PenTool,
  Receipt,
  Sheet,
  UserSearch,
  Video,
} from 'lucide-react';

// Chaves = valor salvo em AtalhoExterno.icone. 'Linkedin' mapeia para UserSearch
// porque a versão instalada do lucide-react removeu os ícones de marca (trademark).
export const EXTERNAL_ICON_MAP: Record<string, typeof LinkIcon> = {
  FileText,
  Landmark,
  Banknote,
  Receipt,
  HardDrive,
  CalendarDays,
  Cloud,
  Linkedin: UserSearch,
  Briefcase,
  Video,
  Camera,
  Kanban,
  CheckSquare,
  BookOpen,
};

export function ExternalIcon({ nome, className, style }: { nome: string; className?: string; style?: CSSProperties }) {
  const Icon = EXTERNAL_ICON_MAP[nome] ?? LinkIcon;
  return <Icon className={className} style={style} />;
}

/** Ícones usados como fallback visual para os cards de ferramentas nativas do catálogo. */
export const TOOL_ICON_MAP: Record<string, typeof LinkIcon> = {
  'Editor de texto': PenTool,
  Planilhas: Sheet,
  'Criador de artes': Camera,
  'Planner pessoal': Calendar,
  'Bloco de notas': NotebookPen,
  'Biblioteca de referência': BookOpen,
};

export function ToolIcon({ nome, className }: { nome: string; className?: string }) {
  const Icon = TOOL_ICON_MAP[nome] ?? Calculator;
  return <Icon className={className} />;
}
