SELECT
  1001 AS id,
  'Pagamento - API - Erro 5xx' AS name,
  'Alert' AS overall_state,
  'jornada:pagamento,tecnologia:api,env:prod,squad:fts' AS tags,
  'https://app.datadoghq.com/monitors/1001' AS monitor_url,
  'https://app.datadoghq.com/dashboard/pagamento-fts' AS datadog_dashboard_url,
  'Pagamento' AS jornada

UNION ALL SELECT
  1002,
  'Pagamento - Banco - Conexões',
  'OK',
  'jornada:pagamento,tecnologia:banco,env:prod,squad:fts',
  'https://app.datadoghq.com/monitors/1002',
  'https://app.datadoghq.com/dashboard/pagamento-fts',
  'Pagamento'

UNION ALL SELECT
  1003,
  'Pagamento - Integração Parceiro X - Timeout',
  'Alert',
  'jornada:pagamento,tecnologia:integracao,env:prod,squad:fts',
  'https://app.datadoghq.com/monitors/1003',
  'https://app.datadoghq.com/dashboard/pagamento-fts',
  'Pagamento'

UNION ALL SELECT
  1004,
  'Pagamento - Fila - Normal',
  'OK',
  'jornada:pagamento,tecnologia:fila,env:prod,squad:fts',
  'https://app.datadoghq.com/monitors/1004',
  'https://app.datadoghq.com/dashboard/pagamento-fts',
  'Pagamento';