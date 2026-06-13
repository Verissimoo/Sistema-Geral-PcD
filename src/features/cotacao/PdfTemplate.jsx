import React from "react";

const PdfTemplate = React.forwardRef(({ dados }, ref) => {
  if (!dados) return <div ref={ref} />;

  const cotacaoNum = String(Math.floor(100000 + Math.random() * 900000));
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString("pt-BR");
  const horaFormatada = hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const bagagensList = [];
  if (dados.textoCompleto) {
    if (dados.textoCompleto.includes("artigo pessoal")) bagagensList.push("🎒 01 artigo pessoal (mochila/bolsa)");
    if (dados.textoCompleto.includes("bagagem de mão")) bagagensList.push("🎒 01 bagagem de mão (10kg)");
    if (dados.textoCompleto.includes("bagagem despachada")) bagagensList.push("🧳 01 bagagem despachada");
  }
  if (bagagensList.length === 0) bagagensList.push("🎒 Somente artigo pessoal");

  const obsExtras = dados.observacoesExtras || "";

  // Extrair códigos IATA
  const origemIata = dados.origem?.match(/([A-Z]{3})/)?.[1] || "";
  const destinoIata = dados.destino?.match(/([A-Z]{3})/)?.[1] || "";

  // Extrair info de escalas
  const escalaMatch = dados.textoCompleto?.match(/(\d+)\s+escala/i);
  const isDireto = dados.textoCompleto?.toLowerCase().includes("direto");
  const escalaViaMatch = dados.textoCompleto?.match(/escala.*?via\s+([^\n)]+)/i);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: "794px",
        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        backgroundColor: "#ffffff",
        color: "#1a1a2e",
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div style={{ background: "#0D2B6E", padding: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", gap: "6px", alignItems: "baseline" }}>
            <span style={{ color: "#ffffff", fontWeight: "bold", fontSize: "22px" }}>PASSAGENS</span>
            <span style={{ color: "#CC1F1F", fontWeight: "bold", fontSize: "22px" }}>COM</span>
            <span style={{ color: "#ffffff", fontWeight: "bold", fontSize: "22px" }}>DESCONTO</span>
          </div>
          <div style={{ color: "#ffffff", fontSize: "11px", opacity: 0.8, marginTop: "6px" }}>
            Agência de Viagens • CADASTUR: 62.830.477/0001-51
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#ffffff", fontWeight: "bold", fontSize: "14px", letterSpacing: "2px", textTransform: "uppercase" }}>
            COTAÇÃO DE PASSAGEM
          </div>
          <div style={{ color: "#F4A224", fontSize: "12px", marginTop: "4px" }}>
            Nº {cotacaoNum}
          </div>
          <div style={{ color: "#ffffff", fontSize: "11px", marginTop: "2px" }}>
            {dataFormatada}
          </div>
        </div>
      </div>

      {/* ═══ BANNER ═══ */}
      <div style={{ background: "#F4A224", padding: "14px 32px", textAlign: "center" }}>
        <span style={{ color: "#ffffff", fontWeight: "bold", fontSize: "18px" }}>
          ✈ {dados.origem || "Origem"} → {dados.destino || "Destino"}
        </span>
      </div>

      {/* ═══ CORPO ═══ */}
      <div style={{ padding: "32px", background: "#ffffff" }}>
        {/* SEÇÃO: ITINERÁRIO */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ color: "#0D2B6E", fontSize: "16px", fontWeight: "bold", borderLeft: "4px solid #F4A224", paddingLeft: "12px", marginBottom: "16px" }}>
            ITINERÁRIO
          </h2>
          {/* Card IDA */}
          <div style={{ background: "#F8F9FF", border: "1px solid #E0E7FF", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
            {dados.companhia && (
              <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "#0D2B6E", color: "#ffffff", borderRadius: "4px", padding: "4px 10px", fontSize: "11px", fontWeight: "bold" }}>
                  {dados.companhia}
                </span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center", gap: "8px" }}>
              {/* COL ESQUERDA */}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "13px" }}>🛫</div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0D2B6E" }}>
                  {dados.horarioSaida || "--:--"}
                </div>
                <div style={{ fontSize: "11px", color: "#666" }}>
                  {origemIata} {dados.origem?.replace(/[A-Z]{3}\s*/, "") || ""}
                </div>
              </div>
              {/* COL CENTRO */}
              <div style={{ textAlign: "center" }}>
                <div style={{ borderTop: "2px dashed #ccc", margin: "0 10px", position: "relative" }}>
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "6px" }}>
                    {dados.duracao || ""}
                  </div>
                  <div style={{ marginTop: "4px" }}>
                    {isDireto ? (
                      <span style={{ background: "#16a34a", color: "#fff", borderRadius: "4px", padding: "2px 8px", fontSize: "10px", fontWeight: "bold" }}>Direto</span>
                    ) : escalaMatch ? (
                      <span style={{ background: "#F4A224", color: "#fff", borderRadius: "4px", padding: "2px 8px", fontSize: "10px", fontWeight: "bold" }}>
                        {escalaMatch[1]} escala(s){escalaViaMatch ? ` via ${escalaViaMatch[1].trim()}` : ""}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {/* COL DIREITA */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "13px" }}>🛬</div>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0D2B6E" }}>
                  {dados.horarioChegada || "--:--"}
                </div>
                <div style={{ fontSize: "11px", color: "#666" }}>
                  {destinoIata} {dados.destino?.replace(/[A-Z]{3}\s*/, "") || ""}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO: DATAS */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ color: "#0D2B6E", fontSize: "16px", fontWeight: "bold", borderLeft: "4px solid #F4A224", paddingLeft: "12px", marginBottom: "16px" }}>
            DATAS
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#F8F9FF", border: "1px solid #E0E7FF", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", marginBottom: "4px" }}>Ida</div>
              <div style={{ fontSize: "15px", fontWeight: "bold", color: "#0D2B6E" }}>📅 {dados.dataIda || "—"}</div>
            </div>
            <div style={{ background: "#F8F9FF", border: "1px solid #E0E7FF", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", marginBottom: "4px" }}>Volta</div>
              <div style={{ fontSize: "15px", fontWeight: "bold", color: dados.dataVolta === "Somente ida" ? "#999" : "#0D2B6E" }}>
                📅 {dados.dataVolta || "Somente ida"}
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO: VALOR */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ color: "#0D2B6E", fontSize: "16px", fontWeight: "bold", borderLeft: "4px solid #F4A224", paddingLeft: "12px", marginBottom: "16px" }}>
            VALOR
          </h2>
          <div style={{ background: "#0D2B6E", padding: "20px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#ffffff", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>VALOR TOTAL</div>
              <div style={{ color: "#F4A224", fontWeight: "bold", fontSize: "32px", marginTop: "4px" }}>{dados.valorTotal || "R$ —"}</div>
            </div>
            <div style={{ color: "#ffffff", fontSize: "12px", maxWidth: "160px", textAlign: "right" }}>
              💳 Consulte opções de parcelamento
            </div>
          </div>
        </div>

        {/* SEÇÃO: PASSAGEIROS E BAGAGEM */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ color: "#0D2B6E", fontSize: "16px", fontWeight: "bold", borderLeft: "4px solid #F4A224", paddingLeft: "12px", marginBottom: "16px" }}>
            PASSAGEIROS E BAGAGEM
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#F8F9FF", border: "1px solid #E0E7FF", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", marginBottom: "6px" }}>Passageiros</div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#0D2B6E" }}>
                👤 {dados.passageiros} Adulto{parseInt(dados.passageiros) > 1 ? "s" : ""}
              </div>
            </div>
            <div style={{ background: "#F8F9FF", border: "1px solid #E0E7FF", borderRadius: "8px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", marginBottom: "6px" }}>Bagagem</div>
              {bagagensList.map((b, i) => (
                <div key={i} style={{ fontSize: "13px", color: "#333", marginBottom: "2px" }}>{b}</div>
              ))}
            </div>
          </div>
        </div>

        {/* SEÇÃO: INCLUSÕES */}
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ color: "#0D2B6E", fontSize: "16px", fontWeight: "bold", borderLeft: "4px solid #F4A224", paddingLeft: "12px", marginBottom: "16px" }}>
            INCLUSÕES
          </h2>
          <div style={{ display: "flex", gap: "16px" }}>
            {["Taxas inclusas", "Assessoria e suporte completo", "Check-in antecipado"].map((item, i) => (
              <div key={i} style={{ flex: 1, background: "#F0FFF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "12px", textAlign: "center", fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                ✅ {item}
              </div>
            ))}
          </div>
        </div>

        {/* SEÇÃO: OBSERVAÇÕES */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ background: "#FFF8E7", border: "1px solid #F4A224", borderRadius: "8px", padding: "16px" }}>
            <div style={{ fontWeight: "bold", color: "#B45309", fontSize: "14px", marginBottom: "10px" }}>⚠️ Observações importantes</div>
            <div style={{ fontSize: "13px", color: "#78350F", lineHeight: "1.8" }}>
              🚨 Valores sujeitos a alteração até o fechamento<br />
              🚨 Taxa de cancelamento conforme regras da cia aérea<br />
              🚨 Pagamento no crédito pode ter taxas adicionais
              {obsExtras && <><br />🚨 {obsExtras}</>}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <div style={{ background: "#F0F2F8", padding: "0 32px" }}>
        <div style={{ borderTop: "2px solid #F4A224", paddingTop: "16px", paddingBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "10px", color: "#666" }}>
            CNPJ: 62.830.477/0001-51 | passagenscomdesconto.com
          </div>
          <div style={{ fontSize: "10px", color: "#666" }}>
            Documento gerado em {dataFormatada} às {horaFormatada}
          </div>
        </div>
      </div>
    </div>
  );
});

PdfTemplate.displayName = "PdfTemplate";

export default PdfTemplate;
