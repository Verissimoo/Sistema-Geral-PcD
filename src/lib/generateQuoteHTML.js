// src/lib/generateQuoteHTML.js
// Gera um documento HTML auto-contido para a cotação, pronto para
// abrir em nova aba e salvar como PDF via window.print().

const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateLong = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateUpper = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00:00");
  return d
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

// ─── Builders ───────────────────────────────────────────────────────

function buildSummaryCards(data, trechoIda, trechoVolta) {
  const cards = [];
  cards.push(`
    <div class="card"><div class="card-i"><svg><use href="#ic-cal"/></svg></div>
      <div><div class="card-lbl">Partida</div>
      <div class="card-val">${esc(formatDateLong(data.dates?.departure))}</div>
      <div class="card-sub">Trecho de ida</div></div></div>`);

  cards.push(`
    <div class="card"><div class="card-i"><svg><use href="#ic-cal"/></svg></div>
      <div><div class="card-lbl">Retorno</div>
      <div class="card-val">${trechoVolta || data.dates?.return ? esc(formatDateLong(data.dates?.return)) : "Somente ida"}</div>
      <div class="card-sub">${trechoVolta ? "Trecho de volta" : "Sem volta"}</div></div></div>`);

  if (trechoIda?.duracao) {
    cards.push(`
      <div class="card"><div class="card-i"><svg><use href="#ic-clock"/></svg></div>
        <div><div class="card-lbl">Duração</div>
        <div class="card-val">${esc(trechoIda.duracao)}</div>
        <div class="card-sub">${(trechoIda.escalas || 0) === 0 ? "Voo direto" : `${trechoIda.escalas} escala(s)`}</div></div></div>`);
  }

  if (trechoIda?.companhia) {
    cards.push(`
      <div class="card"><div class="card-i"><svg><use href="#ic-plane"/></svg></div>
        <div><div class="card-lbl">Companhia</div>
        <div class="card-val">${esc(trechoIda.companhia)}</div>
        <div class="card-sub">${esc(trechoIda.numero_voo || "")}</div></div></div>`);
  }

  cards.push(`
    <div class="card"><div class="card-i"><svg><use href="#ic-shield"/></svg></div>
      <div><div class="card-lbl">Tarifa</div>
      <div class="card-val">${esc(data.ticket_type || "Normal")}</div>
      <div class="card-sub">${esc(trechoIda?.classe || "")}</div></div></div>`);

  cards.push(`
    <div class="card"><div class="card-i"><svg><use href="#ic-bag"/></svg></div>
      <div><div class="card-lbl">Passageiros</div>
      <div class="card-val">${data.passengers || 1} ${data.passengers > 1 ? "Adultos" : "Adulto"}</div>
      <div class="card-sub"></div></div></div>`);

  if (data.services?.insurance?.active) {
    cards.push(`
      <div class="card"><div class="card-i"><svg><use href="#ic-shield"/></svg></div>
        <div><div class="card-lbl">Seguro</div>
        <div class="card-val">Incluso</div>
        <div class="card-sub">${esc(formatBRL(data.services.insurance.value))}</div></div></div>`);
  }
  if (data.services?.transfer?.active) {
    cards.push(`
      <div class="card"><div class="card-i"><svg><use href="#ic-plane"/></svg></div>
        <div><div class="card-lbl">Transfer</div>
        <div class="card-val">Incluso</div>
        <div class="card-sub">${esc(formatBRL(data.services.transfer.value))}</div></div></div>`);
  }

  return cards.join("");
}

function buildFlightCard(trecho, data) {
  const isOut = trecho.tipo !== "volta";
  const dateStr = isOut ? data.dates?.departure : data.dates?.return;
  const dateLong = formatDateLong(dateStr);
  const escalas = trecho.escalas || 0;
  const directLabel = escalas === 0 ? "Voo Direto" : `${escalas} escala(s)`;

  const stopsHtml = `
    <div class="tl-stop">
      <div class="tl-dot filled"><svg><use href="#ic-plane"/></svg></div>
      <div class="tl-time">${esc(trecho.horario_saida || "--:--")}</div>
      <div class="tl-place">${esc(trecho.origem_cidade || "")} (${esc(trecho.origem_iata || "")})</div>
      <div class="tl-fnum">${esc(trecho.companhia || "")}${trecho.numero_voo ? `<span class="tl-sep"></span>${esc(trecho.numero_voo)}` : ""}<span class="tl-sep"></span>${esc(trecho.duracao || "")}</div>
    </div>
    ${escalas > 0 ? `
      <div class="tl-stop">
        <div class="tl-dot dim"><svg><use href="#ic-clock"/></svg></div>
        <div class="conn"><svg><use href="#ic-clock"/></svg> Conexão em ${esc(trecho.aeroporto_escala || "—")}</div>
        <div class="conn-d">Tempo de espera: ${esc(trecho.tempo_escala || "—")}</div>
      </div>
    ` : ""}
    <div class="tl-stop" style="padding-bottom:0">
      <div class="tl-dot filled"><svg><use href="#ic-check"/></svg></div>
      <div class="tl-time">${esc(trecho.horario_chegada || "--:--")}</div>
      <div class="tl-place">${esc(trecho.destino_cidade || "")} (${esc(trecho.destino_iata || "")})</div>
      ${dateLong ? `<div class="arr"><svg><use href="#ic-check"/></svg> Chegada confirmada — ${esc(dateLong)}</div>` : ""}
    </div>`;

  return `
    <div class="flight">
      <div class="fhd ${isOut ? "out" : "ret"}">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="f-badge ${isOut ? "out" : "ret"}"><svg><use href="#ic-plane"/></svg> ${isOut ? "Ida" : "Volta"}</span>
          ${dateLong ? `<span class="f-date">${esc(dateLong)}</span>` : ""}
        </div>
        <div class="f-pills">
          ${trecho.duracao ? `<div class="f-pill"><svg><use href="#ic-clock"/></svg> ${esc(trecho.duracao)}</div>` : ""}
          <div class="f-pill">${directLabel}</div>
          ${trecho.companhia ? `<div class="f-pill">${esc(trecho.companhia)}</div>` : ""}
        </div>
      </div>
      <div class="fbody"><div class="tl">${stopsHtml}</div></div>
    </div>`;
}

function buildBaggage(data) {
  const b = data.baggage || {};
  const card = (hl, label, value, bottom) => `
    <div class="bag${hl ? " hl" : ""}">
      <div class="bag-top">
        <div class="bag-ico"><svg><use href="#ic-bag"/></svg></div>
        <div><div class="bag-lbl">${esc(label)}</div><div class="bag-val">${esc(value)}</div></div>
      </div>
      <div class="bag-bottom">${esc(bottom)}</div>
    </div>`;

  return `
    <div class="bag-grid">
      ${card(
        b.personal,
        "Artigo Pessoal",
        b.personal ? "Bolsa / Mochila" : "Não incluso",
        b.personal ? "Sob o assento da frente" : "Adquira separadamente"
      )}
      ${card(
        b.carry_on,
        "Bagagem de Mão",
        b.carry_on ? "Mala Pequena" : "Não inclusa",
        b.carry_on ? "Até 10 kg · Compartimento superior" : "Adquira separadamente"
      )}
      ${card(
        b.checked,
        "Bagagem Despachada",
        b.checked ? "Mala Grande (23kg)" : "Não inclusa",
        b.checked ? "Até 23 kg · Despachada no check-in" : "Adquira separadamente"
      )}
    </div>`;
}

function buildPriceSection(data, dataFormatada) {
  const total = Number(data.total_value) || 0;

  if (data.competitor && Number(data.competitor.value) > 0) {
    const compValue = Number(data.competitor.value);
    const economia = compValue - total;
    const economiaPct = compValue > 0 ? ((economia / compValue) * 100).toFixed(1) : "0";

    return `
    <div class="price-highlight">
      <div class="ph-left">
        <div class="ph-label">Valor total — PassagensComDesconto</div>
        <div class="ph-price"><span>R$</span>${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="ph-per">Total da proposta</div>
      </div>
      <div class="ph-right">
        <div class="ph-vs">
          <span>vs. mercado</span>
          <span class="ph-vs-price">${esc(formatBRL(compValue))}</span>
          <span>${esc(data.competitor.name || "Concorrente")}</span>
        </div>
        ${economia > 0 ? `
        <div class="ph-saving">
          <div class="ph-saving-lbl">Economia</div>
          <div class="ph-saving-val">${esc(formatBRL(economia))}</div>
          <div class="ph-saving-pct">${economiaPct}% abaixo do mercado</div>
        </div>` : ""}
      </div>
    </div>
    <div class="cmp">
      <div class="cmp-head">
        <span class="cmp-head-title">Comparativo detalhado de mercado</span>
        <span class="cmp-head-date">Verificado em ${esc(dataFormatada)} · Mesma rota · Mesma data</span>
      </div>
      <div class="cmp-cols">
        <div class="cmp-col">
          <div class="cmp-src">${esc(data.competitor.name || "Concorrente")}</div>
          <div class="cmp-price strike">${esc(formatBRL(compValue))}</div>
          <div class="cmp-per">preço de mercado · ${esc(data.competitor.fare_type || "")}</div>
          <div class="cmp-badge mkt">Preço de mercado</div>
        </div>
        <div class="cmp-col best">
          <div class="best-tag">Melhor Oferta</div>
          <div class="cmp-src">PassagensComDesconto</div>
          <div class="cmp-price featured">${esc(formatBRL(total))}</div>
          <div class="cmp-per">com todos os serviços</div>
          ${economia > 0 ? `<div class="cmp-badge best-p">Economia de ${esc(formatBRL(economia))}</div>` : ""}
        </div>
      </div>
      <div class="feat-grid">
        <div class="fc">
          <div class="fc-src">${esc(data.competitor.name || "Concorrente")}</div>
          <div class="feat"><svg class="ok"><use href="#ic-check"/></svg> Passagem aérea</div>
          <div class="feat"><svg class="no"><use href="#ic-x"/></svg> Suporte personalizado</div>
          <div class="feat"><svg class="no"><use href="#ic-x"/></svg> Assessoria de check-in</div>
          <div class="feat"><svg class="no"><use href="#ic-x"/></svg> Suporte em viagem 24h</div>
        </div>
        <div class="fc mid">
          <div class="fc-src">PassagensComDesconto</div>
          <div class="feat"><svg class="ok"><use href="#ic-check"/></svg> Passagem aérea</div>
          <div class="feat"><svg class="ok"><use href="#ic-check"/></svg> Suporte personalizado</div>
          <div class="feat"><svg class="ok"><use href="#ic-check"/></svg> Assessoria de check-in</div>
          <div class="feat"><svg class="ok"><use href="#ic-check"/></svg> Suporte em viagem 24h</div>
        </div>
      </div>
      <div class="cmp-foot">Valores sujeitos à disponibilidade · Preço final confirmado após fechamento do pedido</div>
    </div>`;
  }

  return `
    <div class="price-highlight">
      <div class="ph-left">
        <div class="ph-label">Valor total — PassagensComDesconto</div>
        <div class="ph-price"><span>R$</span>${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="ph-per">Total da proposta</div>
      </div>
      <div class="ph-right">
        <div class="ph-vs">
          <span>parcelamento</span>
          <span style="font-size:13px;color:rgba(255,255,255,.85);font-weight:600;">Consulte opções 💳</span>
          <span>no cartão de crédito</span>
        </div>
      </div>
    </div>`;
}

function buildIncluso(data, tipoViagem, companhia) {
  const items = [];
  items.push(`Passagem aérea ${tipoViagem}${companhia ? ` — ${companhia}` : ""}`);
  if (data.baggage?.personal) items.push("Artigo pessoal (bolsa ou mochila)");
  if (data.baggage?.carry_on) items.push("Bagagem de mão até 10 kg");
  if (data.baggage?.checked) items.push("Bagagem despachada 23 kg");
  items.push("Todas as taxas aeroportuárias inclusas");
  if (data.services?.insurance?.active) items.push("Seguro viagem");
  if (data.services?.transfer?.active) items.push("Transfer aeroporto ↔ hotel");
  if (data.additional && data.additional.description) {
    items.push(esc(data.additional.description));
  }
  items.push("Assessoria completa durante todo o trajeto");
  items.push("Atendimento personalizado 24 horas");

  return `
    <div class="incl-grid">
      ${items.map((t) => `<div class="incl"><svg><use href="#ic-check"/></svg> ${esc(t)}</div>`).join("")}
    </div>`;
}

function buildSpecialWarning(ticketType) {
  if (ticketType === "Hidden City") {
    return `
      <section class="sec" style="padding-top:0">
        <div class="skip-warn">
          <div class="skip-warn-title">⚠️ Atenção — Bilhete Hidden City</div>
          <ul>
            <li>O passageiro desembarcará antes do destino final do bilhete.</li>
            <li>Não despachar bagagem no check-in — apenas bagagem de mão.</li>
            <li>Não fazer check-in online para o trecho completo.</li>
            <li>Confirmar que o passageiro está ciente e de acordo.</li>
          </ul>
        </div>
      </section>`;
  }
  if (ticketType === "Quebra de Trecho") {
    return `
      <section class="sec" style="padding-top:0">
        <div class="skip-warn">
          <div class="skip-warn-title">⚠️ Atenção — Quebra de Trecho</div>
          <ul>
            <li>Bilhetes emitidos separadamente para cada trecho.</li>
            <li>Intervalo mínimo de 2h30m entre os voos.</li>
            <li>O passageiro deve retirar e re-despachar bagagem entre os trechos.</li>
          </ul>
        </div>
      </section>`;
  }
  return "";
}

// ─── CSS ────────────────────────────────────────────────────────────
const CSS = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}img{display:block}
:root{--navy:#0B1E3D;--navy2:#14285A;--red:#CC1B1B;--red-l:#FEF2F2;--red-b:#FECACA;--gold:#A0722A;--gold-l:#FDF5E6;--gold-b:#E8C97A;--green:#166534;--green-l:#F0FDF4;--green-b:#86EFAC;--bg:#FFFFFF;--s1:#F4F6FA;--s2:#E8EDF5;--border:#D8DDE8;--border2:#C2CBDB;--t1:#0B1E3D;--t2:#3A4A6B;--t3:#6B7BA0;--t4:#A0ABBB;--shadow:0 1px 4px rgba(11,30,61,.07),0 4px 14px rgba(11,30,61,.05);--shadow2:0 2px 8px rgba(11,30,61,.09),0 12px 30px rgba(11,30,61,.07);}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--s1);color:var(--t1);font-size:13px;line-height:1.55;-webkit-font-smoothing:antialiased;padding-top:46px;}
.pbar{position:fixed;top:0;left:0;right:0;z-index:500;height:46px;padding:0 28px;display:flex;align-items:center;justify-content:space-between;background:var(--navy);}
.pbar-l{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:500;}
.pbar-btn{display:flex;align-items:center;gap:7px;background:var(--red);color:#fff;border:none;padding:7px 18px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;}
.pbar-btn svg{width:13px;height:13px;}
.doc{max-width:860px;margin:20px auto 40px;background:var(--bg);border-radius:14px;overflow:hidden;box-shadow:var(--shadow2);}
.hd{background:var(--navy);padding:22px 32px 18px;}
.hd-partner{display:flex;align-items:center;justify-content:flex-start;gap:16px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:16px;}
.hd-le-sub{font-size:8.5px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.3);margin-top:3px;}
.hd-meta-row{display:flex;align-items:center;justify-content:space-between;}
.hd-metas{display:flex;gap:28px;}
.hd-meta-lbl{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:2px;}
.hd-meta-val{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:rgba(255,255,255,.85);font-weight:500;}
.hd-status{display:flex;align-items:center;gap:7px;background:rgba(22,101,52,.35);border:1px solid rgba(134,239,172,.3);border-radius:6px;padding:5px 12px;font-size:9.5px;color:#86EFAC;font-weight:600;}
.hd-status-dot{width:6px;height:6px;border-radius:50%;background:#4ADE80;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.hero{padding:26px 32px 22px;border-bottom:1px solid var(--border);display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.hero-eyebrow{display:flex;align-items:center;gap:8px;font-size:9px;letter-spacing:3.5px;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:9px;}
.hero-eyebrow::before{content:'';display:block;width:22px;height:2px;background:var(--gold);border-radius:1px;}
.hero-title{font-size:clamp(22px,3.5vw,36px);font-weight:800;color:var(--navy);line-height:1.1;letter-spacing:-.6px;margin-bottom:8px;}
.hero-title span{color:var(--red);}
.hero-desc{font-size:12px;color:var(--t3);max-width:370px;line-height:1.6;font-weight:400;}
.route-card{background:var(--navy);border-radius:10px;display:flex;align-items:stretch;overflow:visible;box-shadow:var(--shadow);flex-shrink:0;align-self:center;}
.rc-seg{padding:12px 16px;text-align:center;display:flex;flex-direction:column;justify-content:center;min-width:76px;}
.rc-code{font-size:22px;font-weight:800;color:#fff;letter-spacing:1px;line-height:1;}
.rc-city{font-size:7.5px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-top:5px;line-height:1.4;}
.rc-mid{padding:12px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:rgba(255,255,255,.06);border-left:1px solid rgba(255,255,255,.1);border-right:1px solid rgba(255,255,255,.1);}
.rc-mid svg{width:15px;height:15px;color:rgba(255,255,255,.6);}
.rc-type{font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.35);white-space:nowrap;font-weight:700;}
.cards{background:var(--s1);padding:14px 32px;display:flex;gap:10px;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.card{flex:1;min-width:120px;background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:9px;box-shadow:var(--shadow);}
.card-i{width:26px;height:26px;border-radius:6px;background:var(--navy);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.card-i svg{width:12px;height:12px;color:rgba(255,255,255,.8);}
.card-lbl{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--t4);font-weight:600;}
.card-val{font-size:12.5px;font-weight:700;color:var(--t1);}
.card-sub{font-size:9px;color:var(--t4);}
.sec{padding:22px 32px;}
.sec+.sec{padding-top:0;}
.sec-hd{display:flex;align-items:center;gap:10px;margin-bottom:15px;}
.sec-tag{display:inline-flex;align-items:center;gap:7px;background:var(--navy);color:rgba(255,255,255,.85);border-radius:5px;padding:5px 12px;font-size:8.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;}
.sec-tag svg{width:11px;height:11px;}
.sec-line{flex:1;height:1px;background:var(--border);}
.flight{background:var(--bg);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:12px;box-shadow:var(--shadow);}
.fhd{padding:11px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);}
.fhd.out{background:linear-gradient(90deg,#EFF3FB,var(--bg) 65%);}
.fhd.ret{background:linear-gradient(90deg,#FEF2F2,var(--bg) 65%);}
.f-badge{display:inline-flex;align-items:center;gap:6px;border-radius:5px;padding:3px 11px;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;}
.f-badge.out{background:var(--navy);color:#fff;}
.f-badge.ret{background:var(--red);color:#fff;}
.f-badge svg{width:9px;height:9px;}
.f-date{font-size:12px;font-weight:600;color:var(--t1);margin-left:8px;}
.f-pills{display:flex;align-items:center;gap:7px;}
.f-pill{display:flex;align-items:center;gap:4px;background:var(--s1);border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-size:9.5px;color:var(--t2);font-weight:500;}
.f-pill svg{width:9px;height:9px;color:var(--t3);}
.fbody{padding:18px;}
.tl{padding-left:24px;position:relative;}
.tl::before{content:'';position:absolute;left:7px;top:14px;bottom:14px;width:1.5px;background:linear-gradient(180deg,var(--navy),var(--border2),var(--navy));}
.tl-stop{position:relative;padding-bottom:18px;}
.tl-stop:last-child{padding-bottom:0;}
.tl-dot{position:absolute;left:-24px;top:4px;width:15px;height:15px;border-radius:50%;background:var(--bg);border:2px solid var(--navy);display:flex;align-items:center;justify-content:center;}
.tl-dot.filled{background:var(--navy);}
.tl-dot.dim{border-color:var(--border2);background:var(--s1);}
.tl-dot svg{width:7px;height:7px;color:var(--navy);}
.tl-dot.filled svg{color:#fff;}
.tl-dot.dim svg{color:var(--t4);}
.tl-time{font-size:21px;font-weight:800;color:var(--navy);line-height:1;letter-spacing:-.5px;}
.tl-time.dim{font-size:16px;font-weight:600;color:var(--t3);}
.tl-sup{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--red);vertical-align:super;margin-left:2px;}
.tl-place{font-size:11px;color:var(--t2);margin-top:2px;}
.tl-fnum{display:inline-flex;align-items:center;gap:5px;margin-top:5px;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--t4);}
.tl-sep{width:3px;height:3px;border-radius:50%;background:var(--border2);}
.conn{display:inline-flex;align-items:center;gap:7px;background:var(--gold-l);border:1px solid var(--gold-b);border-radius:6px;padding:5px 12px;font-size:10px;color:var(--gold);font-weight:600;margin-bottom:3px;}
.conn svg{width:10px;height:10px;}
.conn-d{font-size:9.5px;color:var(--t4);font-family:'JetBrains Mono',monospace;padding-left:2px;margin-bottom:2px;}
.arr{display:inline-flex;align-items:center;gap:6px;background:var(--green-l);border:1px solid var(--green-b);border-radius:5px;padding:4px 11px;font-size:10px;color:var(--green);font-weight:600;margin-top:5px;}
.arr svg{width:10px;height:10px;}
.bag-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.bag{background:var(--s1);border:1px solid var(--border);border-radius:9px;padding:14px;}
.bag.hl{background:var(--gold-l);border-color:var(--gold-b);}
.bag-top{display:flex;align-items:center;gap:9px;margin-bottom:10px;}
.bag-ico{width:30px;height:30px;border-radius:6px;background:var(--navy);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.bag-ico svg{width:13px;height:13px;color:rgba(255,255,255,.8);}
.bag-lbl{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--t4);font-weight:600;}
.bag-val{font-size:12.5px;font-weight:700;color:var(--t1);margin-top:1px;}
.bag-bottom{font-size:10px;color:var(--t3);padding-top:9px;border-top:1px solid var(--border);}
.bag.hl .bag-bottom{border-color:var(--gold-b);color:var(--green);font-weight:600;}
.price-highlight{background:var(--navy);border-radius:10px;padding:16px 22px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;box-shadow:var(--shadow);}
.ph-label{font-size:8.5px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:4px;}
.ph-price{font-size:34px;font-weight:800;color:#fff;line-height:1;letter-spacing:-1px;}
.ph-price span{font-size:18px;font-weight:600;color:rgba(255,255,255,.6);margin-right:4px;}
.ph-per{font-size:11px;color:rgba(255,255,255,.45);margin-top:3px;}
.ph-right{display:flex;align-items:center;gap:16px;}
.ph-saving{text-align:right;padding:10px 16px;background:rgba(134,239,172,.1);border:1px solid rgba(134,239,172,.2);border-radius:8px;}
.ph-saving-lbl{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#86EFAC;opacity:.8;}
.ph-saving-val{font-size:20px;font-weight:800;color:#4ADE80;line-height:1;margin-top:2px;}
.ph-saving-pct{font-size:10px;color:#86EFAC;margin-top:2px;font-weight:600;}
.ph-vs{display:flex;flex-direction:column;align-items:center;font-size:9px;color:rgba(255,255,255,.3);letter-spacing:1px;text-transform:uppercase;gap:4px;}
.ph-vs-price{font-size:14px;font-weight:600;text-decoration:line-through;color:rgba(255,255,255,.25);}
.cmp{background:var(--bg);border:1px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:var(--shadow);}
.cmp-head{padding:11px 20px;background:var(--s1);border-bottom:1px solid var(--border);display:flex;align-items:center;}
.cmp-head-title{font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--t3);font-weight:600;}
.cmp-head-date{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--t4);margin-left:auto;}
.cmp-cols{display:grid;grid-template-columns:1fr 1fr;}
.cmp-col{padding:20px 16px;text-align:center;border-right:1px solid var(--border);position:relative;}
.cmp-col:last-child{border-right:none;}
.cmp-col.best{background:linear-gradient(180deg,#EFF3FF,var(--bg));}
.best-tag{position:absolute;top:0;left:0;right:0;background:var(--navy);font-size:8px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.85);padding:4px;text-align:center;}
.cmp-src{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--t4);font-weight:600;margin-bottom:10px;}
.cmp-col.best .cmp-src{color:var(--navy);font-weight:800;margin-top:18px;}
.cmp-price{font-size:24px;font-weight:800;color:var(--t1);line-height:1;letter-spacing:-.5px;}
.cmp-price.strike{color:var(--t4);text-decoration:line-through;font-size:18px;font-weight:600;}
.cmp-price.featured{color:var(--navy);}
.cmp-per{font-size:10px;color:var(--t4);margin-top:3px;}
.cmp-badge{display:inline-block;margin-top:10px;padding:4px 11px;border-radius:20px;font-size:8.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}
.cmp-badge.mkt{background:var(--red-l);color:var(--red);border:1px solid var(--red-b);}
.cmp-badge.best-p{background:var(--green-l);color:var(--green);border:1px solid var(--green-b);}
.feat-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--border);}
.fc{padding:13px 16px;border-right:1px solid var(--border);}
.fc:last-child{border-right:none;}
.fc.mid{background:var(--s1);}
.fc-src{font-size:8.5px;letter-spacing:2px;text-transform:uppercase;color:var(--t4);margin-bottom:8px;font-weight:700;}
.fc.mid .fc-src{color:var(--navy);}
.feat{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--t2);padding:3px 0;}
.feat svg.ok{width:11px;height:11px;color:var(--green);}
.feat svg.no{width:11px;height:11px;color:var(--red);}
.cmp-foot{padding:9px 20px;background:var(--s1);border-top:1px solid var(--border);text-align:center;font-size:9.5px;color:var(--t4);}
.incl-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.incl{display:flex;align-items:flex-start;gap:8px;padding:10px 13px;background:var(--green-l);border:1px solid var(--green-b);border-radius:7px;font-size:11.5px;color:var(--t1);}
.incl svg{width:11px;height:11px;color:var(--green);flex-shrink:0;margin-top:2px;}
.alert-list{display:flex;flex-direction:column;gap:7px;}
.alert{display:flex;align-items:flex-start;gap:9px;padding:10px 13px;background:var(--red-l);border:1px solid var(--red-b);border-left:3px solid var(--red);border-radius:6px;font-size:11px;color:#7F1D1D;line-height:1.55;}
.alert svg{width:12px;height:12px;color:var(--red);flex-shrink:0;margin-top:1px;}
.skip-warn{background:#7F1D1D;border-radius:10px;padding:18px 22px;margin-bottom:16px;}
.skip-warn-title{font-size:13px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.skip-warn ul{list-style:none;display:flex;flex-direction:column;gap:6px;}
.skip-warn li{font-size:11.5px;color:rgba(255,255,255,.85);display:flex;align-items:flex-start;gap:8px;}
.skip-warn li::before{content:'⚠';font-size:11px;flex-shrink:0;}
.ft{background:var(--navy);padding:20px 32px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;border-top:3px solid var(--red);}
.ft-by{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:2px;}
.ft-name{font-size:13px;color:#fff;font-weight:700;}
.ft-cnpj{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,.25);margin-top:2px;}
.ft-m{text-align:center;}
.ft-dl{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.35);}
.ft-dv{font-family:'JetBrains Mono',monospace;font-size:12px;color:rgba(255,255,255,.65);margin-top:2px;}
.ft-r{text-align:right;font-size:11px;line-height:2.1;}
.ft-r a{color:rgba(255,255,255,.65);text-decoration:none;}
.ft-r-lbl{font-size:8px;color:rgba(255,255,255,.25);text-transform:uppercase;letter-spacing:1.5px;margin-right:5px;}

@media print{
@page{size:A4;margin:8mm 6mm;}
body{background:#fff!important;padding-top:0!important;}
.pbar{display:none!important;}
.doc{margin:0!important;border-radius:0!important;box-shadow:none!important;max-width:100%!important;}
.hero{padding:14px 20px 12px!important;flex-wrap:wrap!important;gap:10px!important;}
.hero-title{font-size:20px!important;}
.cards{flex-wrap:wrap!important;padding:10px 20px!important;gap:6px!important;}
.card{min-width:90px!important;padding:7px 9px!important;}
.card-val{font-size:11px!important;}
.hd{padding:14px 20px 12px!important;}
.sec{padding:14px 20px!important;}
.sec+.sec{padding-top:0!important;}
.tl-time{font-size:16px!important;}
.ph-price{font-size:22px!important;}
.ph-price span{font-size:13px!important;}
.ph-saving-val{font-size:15px!important;}
.bag-grid{grid-template-columns:repeat(3,1fr)!important;}
.flight,.cmp,.price-highlight,.bag-grid,.incl-grid{page-break-inside:avoid;}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}`;

const SVG_ICONS = `<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
<symbol id="ic-plane" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5Z"/></symbol>
<symbol id="ic-swap" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></symbol>
<symbol id="ic-cal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></symbol>
<symbol id="ic-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></symbol>
<symbol id="ic-bag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2h6l2 4H7Z"/><rect x="2" y="6" width="20" height="16" rx="2"/></symbol>
<symbol id="ic-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></symbol>
<symbol id="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></symbol>
<symbol id="ic-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></symbol>
<symbol id="ic-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></symbol>
<symbol id="ic-money" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></symbol>
<symbol id="ic-dl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></symbol>
</svg>`;

// ─── Função principal ───────────────────────────────────────────────
export function generateQuoteHTML(data) {
  const hoje = new Date();
  const dataFormatada = hoje
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
  const validoAte = new Date(hoje.getTime() + 24 * 60 * 60 * 1000)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();

  const trechos = data.itinerary?.trechos || [];
  const trechoIda = trechos.find((t) => t.tipo === "ida") || trechos[0] || {};
  const trechoVolta = trechos.find((t) => t.tipo === "volta");
  const tipoViagem = trechoVolta ? "Ida e Volta" : "Somente Ida";

  const origemIata = trechoIda?.origem_iata || "";
  const destinoIata = trechoIda?.destino_iata || "";
  const origemCidade = trechoIda?.origem_cidade || "";
  const destinoCidade = trechoIda?.destino_cidade || "";
  const companhia = trechoIda?.companhia || "";

  const economia =
    data.competitor && Number(data.competitor.value) > 0
      ? Number(data.competitor.value) - Number(data.total_value || 0)
      : 0;

  const heroDesc =
    economia > 0
      ? `Proposta personalizada para <strong>${esc(data.client?.name || "")}</strong> — com economia de ${esc(formatBRL(economia))} em relação ao mercado, pelo menor preço disponível.`
      : `Proposta personalizada para <strong>${esc(data.client?.name || "")}</strong> — com o melhor preço disponível e suporte completo.`;

  const flightsHtml = trechos.map((t) => buildFlightCard(t, data)).join("");
  const summaryCardsHtml = buildSummaryCards(data, trechoIda, trechoVolta);
  const bagHtml = buildBaggage(data);
  const priceHtml = buildPriceSection(data, dataFormatada);
  const inclusoHtml = buildIncluso(data, tipoViagem, companhia);
  const specialWarnHtml = buildSpecialWarning(data.ticket_type);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cotação ${esc(data.quoteNumber)} — PassagensComDesconto</title>
<style>${CSS}</style>
</head>
<body>
${SVG_ICONS}

<div class="pbar">
  <span class="pbar-l">PassagensComDesconto · Cotação de Viagem</span>
  <button class="pbar-btn" onclick="window.print()"><svg><use href="#ic-dl"/></svg> Salvar como PDF</button>
</div>

<div class="doc">

<header class="hd">
  <div class="hd-partner">
    <div>
      <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:900;color:#fff;letter-spacing:-.3px;line-height:1;">Passagens<span style="color:#CC1B1B;">Com</span>Desconto</div>
      <div class="hd-le-sub">passagenscomdesconto.com.br</div>
    </div>
  </div>
  <div class="hd-meta-row">
    <div class="hd-metas">
      <div><div class="hd-meta-lbl">Cotação Nº</div><div class="hd-meta-val">${esc(data.quoteNumber)}</div></div>
      <div><div class="hd-meta-lbl">Emitida em</div><div class="hd-meta-val">${esc(dataFormatada)}</div></div>
      <div><div class="hd-meta-lbl">Válida até</div><div class="hd-meta-val">${esc(validoAte)}</div></div>
      <div><div class="hd-meta-lbl">Vendedor</div><div class="hd-meta-val">${esc(data.seller_name || "Equipe PCD")}</div></div>
    </div>
    <div class="hd-status"><div class="hd-status-dot"></div> Disponível para fechamento</div>
  </div>
</header>

<section class="hero">
  <div>
    <div class="hero-eyebrow">Viagem · ${esc(tipoViagem)}</div>
    <h1 class="hero-title">${esc(origemCidade)} (${esc(origemIata)}) <span>para</span><br>${esc(destinoCidade)} (${esc(destinoIata)})</h1>
    <p class="hero-desc">${heroDesc}</p>
  </div>
  <div class="route-card">
    <div class="rc-seg"><div class="rc-code">${esc(origemIata)}</div><div class="rc-city">${esc(origemCidade)}</div></div>
    <div class="rc-mid"><svg><use href="#ic-plane"/></svg><div class="rc-type">${trechoVolta ? "Ida e<br>Volta" : "Somente<br>Ida"}</div></div>
    <div class="rc-seg"><div class="rc-code">${esc(destinoIata)}</div><div class="rc-city">${esc(destinoCidade)}</div></div>
  </div>
</section>

<div class="cards">${summaryCardsHtml}</div>

<section class="sec">
  <div class="sec-hd"><div class="sec-tag"><svg><use href="#ic-plane"/></svg> Itinerário de Voo</div><div class="sec-line"></div></div>
  ${flightsHtml}
</section>

<section class="sec" style="padding-top:0">
  <div class="sec-hd"><div class="sec-tag"><svg><use href="#ic-bag"/></svg> Franquia de Bagagem</div><div class="sec-line"></div></div>
  ${bagHtml}
</section>

<section class="sec" style="padding-top:0">
  <div class="sec-hd"><div class="sec-tag"><svg><use href="#ic-money"/></svg> ${data.competitor ? "Comparativo de Preços" : "Valor da Proposta"}</div><div class="sec-line"></div></div>
  ${priceHtml}
</section>

<section class="sec" style="padding-top:0">
  <div class="sec-hd"><div class="sec-tag"><svg><use href="#ic-check"/></svg> O Que Está Incluso</div><div class="sec-line"></div></div>
  ${inclusoHtml}
</section>

${specialWarnHtml}

<section class="sec" style="padding-top:0">
  <div class="sec-hd"><div class="sec-tag"><svg><use href="#ic-warn"/></svg> Informações Importantes</div><div class="sec-line"></div></div>
  <div class="alert-list">
    <div class="alert"><svg><use href="#ic-warn"/></svg> Valores sujeitos a alteração até a efetivação da compra. Recomendamos o fechamento em até 24h para garantir o preço cotado.</div>
    <div class="alert"><svg><use href="#ic-warn"/></svg> Cancelamentos e remarcações sujeitos às regras da ${esc(companhia || "companhia aérea")}, conforme tarifa ${esc(data.ticket_type || "Normal")}.</div>
    <div class="alert"><svg><use href="#ic-warn"/></svg> Pagamentos via cartão de crédito podem estar sujeitos a taxas adicionais. Consulte as opções de parcelamento disponíveis.</div>
  </div>
</section>

<footer class="ft">
  <div><div class="ft-by">Operado por</div><div class="ft-name">PassagensComDesconto</div><div class="ft-cnpj">CADASTUR · CNPJ: 62.830.477/0001-51</div></div>
  <div class="ft-m"><div class="ft-dl">Data da Cotação</div><div class="ft-dv">${esc(dataFormatada)}</div></div>
  <div class="ft-r"><div><span class="ft-r-lbl">web</span><a href="https://passagenscomdesconto.com.br">passagenscomdesconto.com.br</a></div><div><span class="ft-r-lbl">ig</span><a href="#">@passagenscomdesconto</a></div></div>
</footer>

</div>
</body>
</html>`;
}

export function openQuoteInNewTab(data) {
  const html = generateQuoteHTML(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
