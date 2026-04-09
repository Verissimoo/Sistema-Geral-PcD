import { useState, useEffect } from "react";
import { localClient } from "@/api/localClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckCircle } from "lucide-react";
import RitualFormDialog from "../components/rituals/RitualFormDialog";

const typeColors = {
  "Planejamento mensal": "bg-blue-100 text-blue-700",
  "Acompanhamento quinzenal": "bg-amber-100 text-amber-700",
  "Fechamento mensal": "bg-green-100 text-green-700",
};

export default function Rituals() {
  const [rituals, setRituals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRitual, setEditRitual] = useState(null);

  const load = async () => {
    const data = await localClient.entities.Ritual.list("-event_date");
    setRituals(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleCompleted = async (ritual) => {
    await localClient.entities.Ritual.update(ritual.id, { completed: !ritual.completed });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = rituals.filter(r => !r.completed && new Date(r.event_date) >= new Date());
  const past = rituals.filter(r => r.completed || new Date(r.event_date) < new Date());

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rituais de Acompanhamento</h1>
          <p className="text-muted-foreground text-sm mt-1">Planejamento, acompanhamento e fechamento</p>
        </div>
        <Button onClick={() => { setEditRitual(null); setShowForm(true); }} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-secondary" />
          Próximos Eventos ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">Nenhum evento próximo</Card>
        ) : (
          <div className="space-y-2">
            {upcoming.map(r => (
              <Card key={r.id} className="p-4 flex items-start gap-4 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setEditRitual(r); setShowForm(true); }}>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{new Date(r.event_date).toLocaleDateString("pt-BR", { day: "2-digit" })}</span>
                  <span className="text-xs text-muted-foreground uppercase">{new Date(r.event_date).toLocaleDateString("pt-BR", { month: "short" })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium truncate">{r.title}</h3>
                    <Badge className={`text-xs ${typeColors[r.type] || ""}`}>{r.type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.contractor_name}</p>
                  {r.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.notes}</p>}
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); toggleCompleted(r); }}>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3 text-muted-foreground">Eventos Passados / Concluídos ({past.length})</h2>
        <div className="space-y-2">
          {past.map(r => (
            <Card key={r.id} className="p-4 flex items-start gap-4 opacity-60 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setEditRitual(r); setShowForm(true); }}>
              <div className="w-12 h-12 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0">
                <span className="text-xs font-bold">{new Date(r.event_date).toLocaleDateString("pt-BR", { day: "2-digit" })}</span>
                <span className="text-xs text-muted-foreground uppercase">{new Date(r.event_date).toLocaleDateString("pt-BR", { month: "short" })}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium truncate">{r.title}</h3>
                  <Badge variant="outline" className="text-xs">{r.type}</Badge>
                  {r.completed && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                </div>
                <p className="text-xs text-muted-foreground">{r.contractor_name}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <RitualFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditRitual(null); }}
        onSave={load}
        ritual={editRitual}
      />
    </div>
  );
}