import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { formatBRL } from "@/shared/lib/format";
import { shade } from "./careerShared";

export function HeroLevel({ currentLevel, nextLevel, sellerName }) {
  const c = currentLevel.color;
  return (
    <Card className="border-0 overflow-hidden">
      <CardContent
        className="p-6 md:p-8 text-white"
        style={{ background: `linear-gradient(135deg, ${c} 0%, ${shade(c, -25)} 100%)` }}
      >
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-[0.3em] opacity-80 mb-2 font-bold">
              {sellerName}
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Badge
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 text-xs font-bold"
              >
                {currentLevel.level}
              </Badge>
              <span className="text-xs uppercase tracking-widest opacity-70">
                {currentLevel.minTime}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
              {currentLevel.title}
            </h2>
            <p className="text-sm opacity-80 max-w-xl">{currentLevel.description}</p>
          </div>
          {nextLevel && (
            <div className="bg-[#0B1E3D] rounded-lg p-4 min-w-[200px]">
              <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1 font-semibold">
                Próximo nível
              </div>
              <div className="font-bold text-warning">
                {nextLevel.level}
              </div>
              <div className="text-sm font-semibold">
                {nextLevel.title}
              </div>
              <div className="text-xs text-white/60 mt-1">
                Meta {formatBRL(nextLevel.monthlyGoal)}/mês
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
