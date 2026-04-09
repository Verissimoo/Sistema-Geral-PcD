import { Droppable, Draggable } from "@hello-pangea/dnd";
import ProjectCard from "./ProjectCard";

const columnColors = {
  "Backlog": "border-t-slate-400",
  "Em andamento": "border-t-blue-500",
  "Em validação": "border-t-amber-500",
  "Concluído": "border-t-green-500",
  "Cancelado": "border-t-red-400",
};

export default function KanbanColumn({ columnId, title, projects, onCardClick }) {
  return (
    <div className={`bg-muted/40 rounded-xl border-t-4 ${columnColors[columnId] || "border-t-gray-400"} min-w-[280px] flex flex-col`}>
      <div className="px-3.5 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
          {projects.length}
        </span>
      </div>
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 px-2.5 pb-2.5 space-y-2 min-h-[120px] transition-colors rounded-b-xl ${
              snapshot.isDraggingOver ? "bg-secondary/10" : ""
            }`}
          >
            {projects.map((p, idx) => (
              <Draggable key={p.id} draggableId={p.id} index={idx}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={snapshot.isDragging ? "opacity-80" : ""}
                  >
                    <ProjectCard project={p} onClick={onCardClick} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}