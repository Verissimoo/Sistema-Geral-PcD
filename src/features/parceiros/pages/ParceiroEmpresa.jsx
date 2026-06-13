import { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2, Loader2, Image as ImageIcon, Palette,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { useToast } from "@/shared/ui/use-toast";
import { useAuth } from "@/features/auth/AuthContext";
import {
  usePartner,
  usePartnerCompany,
  usePartnerCompanies,
  useCreatePartnerCompany,
  useUpdatePartnerCompany,
  useUpdatePartner,
} from "@/api/hooks";
import { supabase } from "@/shared/lib/supabase";
import PartnerLogo from "@/features/parceiros/components/PartnerLogo";

const BUCKET = "pcd-partner-logos";

export default function ParceiroEmpresa() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "", cnpj: "", phone: "", email: "",
    address: "", city: "", state: "",
    primary_color: "#0B1E3D", secondary_color: "#F4A224",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  // Trava síncrona contra clique duplo no salvar.
  const isSavingRef = useRef(false);

  const {
    data: partner,
    isLoading: partnerLoading,
    isFetched: partnerFetched,
  } = usePartner(user?.id);
  const companyId = partner?.company_id;
  const {
    data: companyById,
    isLoading: companyByIdLoading,
    isFetched: companyByIdFetched,
  } = usePartnerCompany(companyId);
  // Fallback: tenta buscar empresa por partner_id (caso vínculo ainda não tenha sido feito)
  const needsCompanyFallback =
    !!user?.id && partnerFetched && (!companyId || (companyByIdFetched && !companyById));
  const { data: allCompanies = [], isLoading: companiesLoading } = usePartnerCompanies({
    enabled: needsCompanyFallback,
  });

  const company = useMemo(() => {
    if (companyById) return companyById;
    if (!needsCompanyFallback) return null;
    return allCompanies.find((x) => x.partner_id === user?.id) || null;
  }, [companyById, needsCompanyFallback, allCompanies, user?.id]);
  const loading =
    !user?.id ||
    partnerLoading ||
    companyByIdLoading ||
    (needsCompanyFallback && companiesLoading);

  const updateCompany = useUpdatePartnerCompany();
  const createCompany = useCreatePartnerCompany();
  const updatePartner = useUpdatePartner();

  // Preenche o formulário a partir da empresa carregada — re-executa quando a
  // empresa muda (inclusive após salvar, replicando o reload do código antigo).
  useEffect(() => {
    if (!company) return;
    setFormData({
      name: company.name || "",
      cnpj: company.cnpj || "",
      phone: company.phone || "",
      email: company.email || "",
      address: company.address || "",
      city: company.city || "",
      state: company.state || "",
      primary_color: company.primary_color || "#0B1E3D",
      secondary_color: company.secondary_color || "#F4A224",
    });
    setLogoPreview(company.logo_url || null);
    setCoverPreview(company.cover_image_url || null);
  }, [company]);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const uploadFile = async (file, prefix) => {
    const ext = file.name.split(".").pop();
    const fileName = `${prefix}-${user.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Nome da empresa é obrigatório", variant: "destructive" });
      return;
    }
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);

    try {
      let logoUrl = company?.logo_url || null;
      let coverUrl = company?.cover_image_url || null;

      try {
        if (logoFile) logoUrl = await uploadFile(logoFile, "logo");
        if (coverFile) coverUrl = await uploadFile(coverFile, "cover");
      } catch (err) {
        // Upload de storage não passa pelo react-query — toast local.
        console.error(err);
        toast({
          title: "Erro ao salvar",
          description: err.message || "Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        name: formData.name.trim(),
        cnpj: formData.cnpj.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        logo_url: logoUrl,
        cover_image_url: coverUrl,
        partner_id: user.id,
      };

      try {
        if (company) {
          await updateCompany.mutateAsync({ id: company.id, updates: payload });
        } else {
          const created = await createCompany.mutateAsync(payload);
          await updatePartner.mutateAsync({ id: user.id, updates: { company_id: created.id } });
        }
      } catch {
        // Erro já exibido pelo toast central (query-client).
        return;
      }

      toast({ title: "Empresa atualizada", description: "Suas informações foram salvas." });
      setLogoFile(null);
      setCoverFile(null);
      // A invalidação automática das mutations refaz o fetch da empresa,
      // que re-popula o formulário (substitui o antigo await load()).
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Minha Empresa</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Configure os dados que aparecerão nos seus orçamentos
        </p>
      </div>

      {/* Preview da identidade visual */}
      <Card className="overflow-hidden border-border/50">
        <div
          className="h-36 relative"
          style={{
            background: coverPreview
              ? `url(${coverPreview}) center/cover`
              : `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`,
          }}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute inset-0 flex items-center justify-between p-6 gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <PartnerLogo
                src={logoPreview}
                alt={formData.name}
                variant="preview"
              />
              <div className="text-white min-w-0">
                <p className="text-xs uppercase tracking-wider opacity-80">Sua marca</p>
                <p className="text-xl font-bold drop-shadow-md truncate">
                  {formData.name || "Nome da empresa"}
                </p>
              </div>
            </div>
            <Badge style={{ background: formData.secondary_color, color: "#fff" }} className="border-0 shrink-0">
              Preview
            </Badge>
          </div>
        </div>
      </Card>

      {/* Dados da empresa */}
      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" /> Dados da empresa
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome da empresa *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input
                value={formData.cnpj}
                onChange={(e) => setFormData((p) => ({ ...p, cnpj: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Endereço</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input
                value={formData.state}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, state: e.target.value.toUpperCase() }))
                }
                maxLength={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identidade visual */}
      <Card className="border-border/50">
        <CardContent className="p-6 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" /> Identidade visual
          </h2>

          {/* Logo */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Logotipo
            </Label>
            <div className="flex items-start gap-4">
              <PartnerLogo src={logoPreview} alt="Logo" variant="card" />
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoChange}
                />
                <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  <p>📐 <strong>Recomendado:</strong> PNG com fundo transparente</p>
                  <p>🎨 <strong>Cores escuras</strong> aparecem melhor no banner (que tem overlay escuro)</p>
                  <p>✨ A borda âmbar destaca sua logo automaticamente</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cover */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Imagem de referência visual (capa)
            </Label>
            <div className="flex items-start gap-4">
              {coverPreview && (
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-32 h-20 rounded-lg object-cover border"
                />
              )}
              <div className="flex-1">
                <Input type="file" accept="image/*" onChange={handleCoverChange} />
                <p className="text-xs text-muted-foreground mt-1">
                  Imagem que aparece como background do header do PDF. Recomendado: 1200×400 px.
                </p>
              </div>
            </div>
          </div>

          {/* Cores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cor primária</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, primary_color: e.target.value }))
                  }
                  className="w-12 h-10 rounded cursor-pointer border shrink-0"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, primary_color: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cor secundária</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, secondary_color: e.target.value }))
                  }
                  className="w-12 h-10 rounded cursor-pointer border shrink-0"
                />
                <Input
                  value={formData.secondary_color}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, secondary_color: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="bg-warning hover:bg-warning text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
            </>
          ) : (
            "Salvar configurações"
          )}
        </Button>
      </div>
    </div>
  );
}
