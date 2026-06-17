# iTGuy Datadog Monitors App

Pacote unificado para Grafana contendo:

- App plugin raiz: `itguy-datadog-monitors-app`
- Datasource nested backend Go: `itguy-datadog-monitors-datasource`
- Panel nested React: `itguy-datadog-monitors-panel`

## O que mudou

- O datasource deixou de usar apenas Data Proxy no frontend e passou a consultar o Datadog no backend Go.
- O painel continua em React/TypeScript, dentro do mesmo pacote do app.
- O datasource possui cache em memória dos detalhes dos monitores da org, com TTL fixo de 2h.
- O cache é forçado no `Save & Test` do datasource, via `CheckHealth`.
- A estrutura de frontend foi separada em `datasource/query`, `panel/components` e `panel/options`.

## Cache

O cache guarda o inventário/detalhe dos monitores retornado por `/api/v1/monitor`.

O status operacional continua sendo consultado via `/api/v1/monitor/search` e `/api/v1/monitor/groups/search` a cada query, para evitar mostrar alertas desatualizados por 2h.

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
mage linux
```

Para servidor Linux ARM64:

```bash
go mod tidy
npm run build
mage linuxARM64
```

O binário será gerado em `dist/` e também copiado para `dist/datasource/`, com o prefixo esperado pelo `plugin.json`:

```text
gpx_itguy-datadog-monitors-datasource_linux_amd64
```

## Empacotamento local

Após build frontend + backend:

```bash
mv dist itguy-datadog-monitors-app
zip -r itguy-datadog-monitors-app-0.2.0.zip itguy-datadog-monitors-app
```

## Instalação no Grafana

Copie a pasta gerada para o diretório de plugins do Grafana e reinicie o serviço.

Para ambiente privado/não assinado, lembre-se de permitir os três IDs se necessário:

```ini
[plugins]
allow_loading_unsigned_plugins = itguy-datadog-monitors-app,itguy-datadog-monitors-datasource,itguy-datadog-monitors-panel
```

## Observação importante

O cache é em memória por processo do plugin. Em Grafana HA, cada instância terá seu próprio cache.
