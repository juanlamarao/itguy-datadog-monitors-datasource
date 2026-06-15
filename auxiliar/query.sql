WITH datadog_monitors AS (
    SELECT
        1001 AS id,
        'Pagamento - API - Erro 5xx' AS name,
        'Alert' AS overall_state,
        JSON_ARRAY('jornada:pagamento', 'tecnologia:api', 'env:prod', 'squad:fts') AS tags,
        'https://app.datadoghq.com/monitors/1001' AS monitor_url,
        'https://app.datadoghq.com/dashboard/pagamento-fts' AS datadog_dashboard_url,
        'Pagamento' AS jornada

    UNION ALL SELECT
        1002,
        'Pagamento - API - Latência elevada',
        'Warn',
        JSON_ARRAY('jornada:pagamento', 'tecnologia:api', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/1002',
        'https://app.datadoghq.com/dashboard/pagamento-fts',
        'Pagamento'

    UNION ALL SELECT
        1003,
        'Pagamento - Banco - Conexões',
        'OK',
        JSON_ARRAY('jornada:pagamento', 'tecnologia:banco', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/1003',
        'https://app.datadoghq.com/dashboard/pagamento-fts',
        'Pagamento'

    UNION ALL SELECT
        1004,
        'Pagamento - Fila - Mensagens acumuladas',
        'OK',
        JSON_ARRAY('jornada:pagamento', 'tecnologia:fila', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/1004',
        'https://app.datadoghq.com/dashboard/pagamento-fts',
        'Pagamento'

    UNION ALL SELECT
        1005,
        'Pagamento - Integração Parceiro X - Timeout',
        'Alert',
        JSON_ARRAY('jornada:pagamento', 'tecnologia:integracao', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/1005',
        'https://app.datadoghq.com/dashboard/pagamento-fts',
        'Pagamento'

    UNION ALL SELECT
        2001,
        'Cadastro - API - Healthcheck',
        'OK',
        JSON_ARRAY('jornada:cadastro', 'tecnologia:api', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/2001',
        'https://app.datadoghq.com/dashboard/cadastro-fts',
        'Cadastro'

    UNION ALL SELECT
        2002,
        'Cadastro - Banco - Storage elevado',
        'Warn',
        JSON_ARRAY('jornada:cadastro', 'tecnologia:banco', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/2002',
        'https://app.datadoghq.com/dashboard/cadastro-fts',
        'Cadastro'

    UNION ALL SELECT
        2003,
        'Cadastro - Fila - Consumo normal',
        'OK',
        JSON_ARRAY('jornada:cadastro', 'tecnologia:fila', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/2003',
        'https://app.datadoghq.com/dashboard/cadastro-fts',
        'Cadastro'

    UNION ALL SELECT
        2004,
        'Cadastro - Job - Atraso no processamento',
        'Warn',
        JSON_ARRAY('jornada:cadastro', 'tecnologia:job', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/2004',
        'https://app.datadoghq.com/dashboard/cadastro-fts',
        'Cadastro'

    UNION ALL SELECT
        3001,
        'Consulta - API - Healthcheck',
        'OK',
        JSON_ARRAY('jornada:consulta', 'tecnologia:api', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/3001',
        'https://app.datadoghq.com/dashboard/consulta-fts',
        'Consulta'

    UNION ALL SELECT
        3002,
        'Consulta - Cache - Hit ratio',
        'OK',
        JSON_ARRAY('jornada:consulta', 'tecnologia:cache', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/3002',
        'https://app.datadoghq.com/dashboard/consulta-fts',
        'Consulta'

    UNION ALL SELECT
        3003,
        'Consulta - Banco - Latência',
        'OK',
        JSON_ARRAY('jornada:consulta', 'tecnologia:banco', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/3003',
        'https://app.datadoghq.com/dashboard/consulta-fts',
        'Consulta'

    UNION ALL SELECT
        4001,
        'Pix - API - Healthcheck',
        'OK',
        JSON_ARRAY('jornada:pix', 'tecnologia:api', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/4001',
        'https://app.datadoghq.com/dashboard/pix-fts',
        'Pix'

    UNION ALL SELECT
        4002,
        'Pix - Banco - Latência elevada',
        'Warn',
        JSON_ARRAY('jornada:pix', 'tecnologia:banco', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/4002',
        'https://app.datadoghq.com/dashboard/pix-fts',
        'Pix'

    UNION ALL SELECT
        4003,
        'Pix - Mensageria - Fila normal',
        'OK',
        JSON_ARRAY('jornada:pix', 'tecnologia:mensageria', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/4003',
        'https://app.datadoghq.com/dashboard/pix-fts',
        'Pix'

    UNION ALL SELECT
        4004,
        'Pix - Job - Worker atrasado',
        'Warn',
        JSON_ARRAY('jornada:pix', 'tecnologia:job', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/4004',
        'https://app.datadoghq.com/dashboard/pix-fts',
        'Pix'

    UNION ALL SELECT
        5001,
        'Extrato - API - Healthcheck',
        'OK',
        JSON_ARRAY('jornada:extrato', 'tecnologia:api', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/5001',
        'https://app.datadoghq.com/dashboard/extrato-fts',
        'Extrato'

    UNION ALL SELECT
        5002,
        'Extrato - Banco - Consultas',
        'OK',
        JSON_ARRAY('jornada:extrato', 'tecnologia:banco', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/5002',
        'https://app.datadoghq.com/dashboard/extrato-fts',
        'Extrato'

    UNION ALL SELECT
        5003,
        'Extrato - Frontend - Disponibilidade',
        'OK',
        JSON_ARRAY('jornada:extrato', 'tecnologia:frontend', 'env:prod', 'squad:fts'),
        'https://app.datadoghq.com/monitors/5003',
        'https://app.datadoghq.com/dashboard/extrato-fts',
        'Extrato'
)

SELECT
    id,
    name,
    overall_state,
    tags,
    monitor_url,
    datadog_dashboard_url,
    jornada
FROM datadog_monitors
WHERE jornada = '${jornada}'
ORDER BY
    CASE overall_state
        WHEN 'Alert' THEN 1
        WHEN 'Warn' THEN 2
        WHEN 'OK' THEN 3
        ELSE 4
    END,
    name;