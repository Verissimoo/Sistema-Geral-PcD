import {
  User, Phone, Mail, Briefcase, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";

export function ParceiroDadosCard({
  partnerInfo,
  onPartnerInfoChange,
  clientName,
  onClientNameChange,
  clientPhone,
  onClientPhoneChange,
  clientEmail,
  onClientEmailChange,
}) {
  return (
    <>
      {/* Dados do parceiro (você) */}
      <Card className="border-warning/30 bg-warning/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-warning">
            <Briefcase className="h-4 w-4" /> Seus dados (Parceiro)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Seu nome *</Label>
            <Input
              id="p-name"
              value={partnerInfo.name}
              onChange={(e) => onPartnerInfoChange((p) => ({ ...p, name: e.target.value }))}
              placeholder="Como aparecerá no orçamento"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Seu telefone *
              </Label>
              <Input
                id="p-phone"
                value={partnerInfo.phone}
                onChange={(e) => onPartnerInfoChange((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Seu email{" "}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="p-email"
                type="email"
                value={partnerInfo.email}
                onChange={(e) => onPartnerInfoChange((p) => ({ ...p, email: e.target.value }))}
                placeholder="voce@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do cliente */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" /> Dados do cliente final
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cli-name">Nome do cliente *</Label>
            <Input
              id="cli-name"
              value={clientName}
              onChange={(e) => onClientNameChange(e.target.value)}
              placeholder="Ex: João da Silva"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cli-phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Telefone
              </Label>
              <Input
                id="cli-phone"
                value={clientPhone}
                onChange={(e) => onClientPhoneChange(e.target.value)}
                placeholder="(61) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cli-email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                id="cli-email"
                type="email"
                value={clientEmail}
                onChange={(e) => onClientEmailChange(e.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function CoBrandingCard({ coBranding, onCoBrandingChange }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={coBranding}
            onCheckedChange={(v) => onCoBrandingChange(v === true)}
            className="mt-0.5"
          />
          <div>
            <p className="font-medium text-sm flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-warning" />
              Mostrar parceria com PassagensComDesconto
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adiciona a tag "em parceria com PassagensComDesconto" no rodapé do PDF, junto da logo.
            </p>
          </div>
        </label>
      </CardContent>
    </Card>
  );
}
