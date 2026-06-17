# iTGuy Datadog Observability App

Pacote unificado para Grafana contendo:

- App plugin raiz: `itguy-datadog-observability-app`
- Datasource nested backend Go: `itguy-datadog-observability-datasource`
- Panel nested React: `itguy-datadog-monitors-panel`

## Objetivo

O projeto deixou de ser apenas um app de monitores e passa a ser uma base de Observability para Datadog dentro do Grafana.

Nesta versão inicial, o app suporta:

- Monitores Datadog
- Monitor groups Datadog
- Métricas Datadog via timeseries

A estrutura foi preparada para futuras features, como logs, synthetics, SLOs, incidents, inventory e APM/traces.

## Arquitetura

```text
src/
├── plugin.json                    # App raiz
├── datasource/                    # Datasource nested
│   ├── plugin.json
│   ├── module.ts
│   ├── datasource.ts
│   ├── types.ts
│   ├── components/
│   │   ├── ConfigEditor.tsx
│   │   └── QueryEditor.tsx
│   └── query/
│       ├── builder.ts             # Builder de query de monitores
│       ├── parser.ts              # Parser raw -> builder de monitores
│       └── options.ts
└── panel/                         # Panel nested especializado em monitores
    ├── plugin.json
    ├── module.ts
    ├── options.ts
    ├── types.ts
    └── components/
        └── DatadogMonitorsPanel.tsx

pkg/
├── main.go
├── plugin/
│   ├── datasource.go              # Instância datasource + resources
│   ├── query.go                   # Roteador por queryType
│   ├── frames.go                  # Conversão para DataFrames Grafana
│   └── settings.go
├── datadog/
│   ├── client.go                  # Cliente HTTP Datadog
│   ├── models.go
│   ├── normalize.go               # Normalização de monitores
│   ├── metrics.go                 # Normalização de métricas
│   └── query_builder.go           # Builder de query de monitores
└── cache/
    └── monitor_cache.go           # Cache TTL de detalhes dos monitores
```

## Query types atuais

### `monitor`

Consulta `/api/v1/monitor/search`.

Formatos:

- `table`
- `problems`

### `group_monitor`

Consulta `/api/v1/monitor/groups/search` e usa o cache de detalhes de monitores para enriquecer os resultados.

Formatos:

- `table`
- `problems`

### `all`

Consulta `monitor` + `group_monitor`.

Formatos:

- `table`
- `problems`

### `metric`

Consulta `/api/v1/query` usando o time range do painel Grafana.

Exemplos:

```text
avg:system.cpu.user{*}
avg:system.cpu.user{env:prod} by {host}
sum:trace.http.request.hits{service:checkout}.as_count()
```

Formatos:

- `timeseries`: retorna frames nativos para gráficos de séries temporais.
- `table`: retorna cada ponto em uma linha, útil para debug e transformação.

## Cache

O cache guarda o inventário/detalhe dos monitores retornado por `/api/v1/monitor`.

TTL fixo atual:

```text
2h
```

O status operacional continua sendo consultado via `/api/v1/monitor/search` e `/api/v1/monitor/groups/search` a cada query, para evitar mostrar alertas desatualizados por 2h.

O cache é forçado no `Save & Test` do datasource, via `CheckHealth`.

Rotas resource disponíveis após o datasource estar salvo:

- `GET /cache/status`
- `GET /cache/refresh`

## Build no servidor Grafana

Instale pré-requisitos no servidor onde você vai empacotar:

```bash
node -v
npm -v
go version
mage -version
```

Depois, dentro da pasta do projeto:

```bash
npm install
go mod tidy
npm run build
npm run backend:linux
```

Para servidor Linux ARM64:

```bash
go mod tidy
npm run build
npm run backend:linux-arm64
```

O binário será gerado em `dist/` e também copiado para `dist/datasource/`, com o prefixo esperado pelo `plugin.json`:

```text
gpx_itguy-datadog-observability-datasource_linux_amd64
```

## Empacotamento local

Após build frontend + backend:

```bash
mv dist itguy-datadog-observability-app
zip -r itguy-datadog-observability-app-0.3.1.zip itguy-datadog-observability-app
```

## Instalação no Grafana

Copie a pasta gerada para o diretório de plugins do Grafana e reinicie o serviço.

Para ambiente privado/não assinado, lembre-se de permitir os três IDs se necessário:

```ini
[plugins]
allow_loading_unsigned_plugins = itguy-datadog-observability-app,itguy-datadog-observability-datasource,itguy-datadog-monitors-panel
```

## Observações importantes

- O cache é em memória por processo do plugin. Em Grafana HA, cada instância terá seu próprio cache.
- Métricas não usam cache longo; a consulta respeita o time range do painel.
- A troca do ID do datasource de `itguy-datadog-monitors-datasource` para `itguy-datadog-observability-datasource` deixa o projeto semanticamente preparado para crescer além de monitores. Caso você já tenha dashboards usando o ID antigo, será necessário recriar/ajustar o datasource.


## Tooling / create-plugin

Este projeto foi ajustado para seguir o padrão atual do `@grafana/create-plugin`: o `create-plugin` é usado para scaffold/update do projeto, enquanto o build local usa `webpack` para o frontend e `mage` para o backend Go.

Não existe dependência `@grafana/plugin-tools` no `package.json`, porque esse nome é o repositório/portal de ferramentas, não o pacote de build a ser instalado pelo npm.
