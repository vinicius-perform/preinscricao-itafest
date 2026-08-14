// ==============================================================================
// CÓDIGO GOOGLE APPS SCRIPT PARA O ITAFEST OFFROAD
// Cole este código no editor de script da sua Planilha Google (Extensões > Apps Script)
// ==============================================================================

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rawData = JSON.parse(e.postData.contents);

    // Se a planilha estiver vazia, adiciona o cabeçalho oficial das colunas
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Data/Hora",
        "Nome Completo",
        "Cidade/UF",
        "Telefone",
        "Marca",
        "Modelo",
        "Ano",
        "Motorização",
        "Combustível",
        "Câmbio",
        "Estado do Veículo",
        "Modificações",
        "Outras Modificações",
        "Dinamômetro / Potência",
        "Detalhes da Potência",
        "Equipamentos de Segurança",
        "Modalidade de Participação"
      ]);
      
      // Destaca o cabeçalho
      sheet.getRange(1, 1, 1, 17).setFontWeight("bold").setBackground("#ff5500").setFontColor("#ffffff");
    }

    // Formata o array de modificações em texto legível separado por vírgulas
    var modificacoesStr = Array.isArray(rawData.modificacoes) 
      ? rawData.modificacoes.join(", ") 
      : (rawData.modificacoes || "");

    // Monta a linha com todos os dados atualizados
    var rowData = [
      new Date(),
      rawData.nome || "",
      rawData.cidadeUf || "",
      rawData.telefone || "",
      rawData.marca || "",
      rawData.modelo || "",
      rawData.ano || "",
      rawData.motorizacao || "",
      rawData.combustivel || "",
      rawData.cambio || "",
      rawData.estadoVeiculo || "",
      modificacoesStr,
      rawData.outrasModificacoes || "",
      rawData.dinamometro || "",
      rawData.potenciaDetalhe || "",
      rawData.seguranca || "",
      rawData.modalidade || ""
    ];

    sheet.appendRow(rowData);

    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
