// Reconhece notificações de Pix, cartão e transferências a partir do texto.
// Função pura, sem depender do resto do app: serve também para uma ponte futura
// (app nativo Android ou Open Finance) chamar window.PDD.notif(texto).
function lerNotif(texto) {
  const s = String(texto).replace(/\s+/g, " ").trim();
  const m = s.match(/R\$\s*(\d+(?:\.\d{3})*(?:,\d{2})?)/);
  if (!m) return null;
  const valor = Number(m[1].replace(/\./g, "").replace(",", "."));
  if (!(valor > 0)) return null;
  const n = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const entrada = /voce recebeu|recebeu um pix|pix recebido|transferencia recebida|recebimento|deposito|credito em conta|te enviou|para voce|recebid[oa]/.test(n);
  const saida = /pix enviado|voce enviou|voce pagou|pagamento|compra|debito|transferencia enviada|saque|boleto|fatura/.test(n);
  const tipo = entrada ? "entrada" : saida ? "saida" : null;
  if (!tipo) return null;
  const meio = /pix/.test(n) ? "Pix" : /credito|cartao/.test(n) ? "Cartão de crédito" : /debito/.test(n) ? "Cartão de débito"
    : /boleto/.test(n) ? "Boleto" : /transferencia|\bted\b|\bdoc\b/.test(n) ? "Transferência" : "Compra";
  const q = s.replace(m[0], " ").match(/\b(?:de|do|da|para|em|no|na|por)\s+((?:[A-ZÀ-ÖØ-Þ][\wÀ-ÿ'&.-]*)(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-ÖØ-Þ0-9][\wÀ-ÿ'&.-]*){0,4})/);
  let quem = q ? q[1].replace(/[.\-&']+$/, "").trim() : "";
  if (quem && quem === quem.toUpperCase()) quem = quem.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
  return { tipo, valor, quem, meio };
}
