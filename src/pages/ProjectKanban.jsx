import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProjects, useUpdateProject } from "@/api/hooks";
import { qk } from "@/api/queryKeys";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import KanbanColumn from "../components/kanban/KanbanColumn";
import ProjectFormDialog from "../components/kanban/ProjectFormDialog";
import { calculateScore } from "@/lib/scoring";

const COLUMNS = ["Backlog", "Em andamento", "Em validação", "Concluído", "Cancelado"];

export default function ProjectKanban() {
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading: loading } = useProjects();
  const updateProject = useUpdateProject();
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    const project = projects.find(p => p.id === draggableId);
    if (!project) return;

    // Atualização otimista do cache local
    const calculatedScore = newStatus === "Concluído" ? calculateScore(project) : null;

    queryClient.setQueryData(qk.projects.list(), (prev = []) => prev.map(p =>
      p.id === draggableId
        ? {
            ...p,
            status: newStatus,
            final_score: calculatedScore,
            completion_date: newStatus === "Concluído" ? new Date().toISOString().split("T")[0] : p.completion_date
          }
        : p
    ));

    const updateData = { status: newStatus };
    if (newStatus === "Concluído") {
      updateData.final_score = calculatedScore;
      updateData.completion_date = new Date().toISOString().split("T")[0];
    }

    updateData.change_log = [
      ...(project.change_log || []),
      { date: new Date().toISOString(), description: `Status alterado para: ${newStatus}`, changed_by: "sistema" }
    ];

    try {
      // A invalidação automática pós-mutation recarrega IDs gerados e logs do servidor
      await updateProject.mutateAsync({ id: draggableId, updates: updateData });
    } catch (err) {
      console.error("Erro ao sincronizar drag-and-drop:", err);
      // Fallback: recarrega estado original em caso de erro
      queryClient.invalidateQueries({ queryKey: qk.projects.all });
    }
  };

  const handleCardClick = (project) => {
    setEditProject(project);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const projectsByColumn = {};
  COLUMNS.forEach(col => {
    projectsByColumn[col] = projects.filter(p => p.status === col);
  });

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backlog de Projetos</h1>
          <p className="text-muted-foreground text-sm mt-1">Arraste cards entre colunas para atualizar status</p>
        </div>
        <Button onClick={() => { setEditProject(null); setShowForm(true); }} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col}
                columnId={col}
                title={col}
                projects={projectsByColumn[col]}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      <ProjectFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditProject(null); }}
        project={editProject}
      />
    </div>
  );
}