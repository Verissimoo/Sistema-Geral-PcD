import { Badge } from "@/components/ui/badge";
import { calculateScore, isFullyAccepted } from "@/lib/scoring";
import { Clock, CheckCircle2, FileText } from "lucide-react";

const valueColors = {
  "Financeiro direto": "bg-green-100 text-green-700",
  "Tempo/Produtividade": "bg-blue-100 text-blue-700",
  "Experiência do cliente": "bg-purple-100 text-purple-700",
};

export default function ProjectCard({ project, onClick }) {
  const score = project.final_score || calculateScore(project);
  const accepted = isFullyAccepted(project);
  const overdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== "Concluído" && project.status !== "Cancelado";
  const acceptanceCount = [project.acceptance_tested, project.acceptance_validated, project.acceptance_documented, project.acceptance_monitored].filter(Boolean).length;

  return (
    <div
      onClick={() => onClick(project)}
      className="bg-card border border-border rounded-lg p-3.5 cursor-pointer hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
          {project.name}
        </h4>
        <span className="text-xs font-bold text-secondary shrink-0">{score} pts</span>
      </div>
      
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5">{project.scope_summary}</p>
      
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        <Badge variant="secondary" className={`text-xs py-0 ${valueColors[project.value_type] || ""}`}>
          {project.value_type}
        </Badge>
        {project.contractor_name && (
          <Badge variant="outline" className="text-xs py-0">{project.contractor_name}</Badge>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className={`flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : ""}`}>
          <Clock className="h-3 w-3" />
          {project.deadline || "Sem prazo"}
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className={`h-3 w-3 ${accepted ? "text-green-600" : ""}`} />
          {acceptanceCount}/4
        </span>
        {(project.documentation_link || project.documentation_file) && (
          <FileText className="h-3 w-3 text-blue-500" />
        )}
      </div>
    </div>
  );
}