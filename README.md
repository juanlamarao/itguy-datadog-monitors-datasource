# Plugin Grafana Datasource - Datadog Monitors

## 1. Objetivo

Este documento descreve a primeira versão do plugin datasource do Grafana para integração com o Datadog, com foco em consultar monitores em estado de alerta e retornar os dados consolidados para uso em painéis do Grafana.

Nesta versão inicial, o plugin foi desenvolvido como um **datasource plugin frontend-only em TypeScript/React**, utilizando o **Data Source Proxy do Grafana** para encaminhar as requisições ao Datadog sem expor as chaves de API no navegador.

O plugin ainda não possui backend em Go. Funcionalidades como cache compartilhado, logs avançados no servidor, refresh automático controlado e enriquecimento detalhado dos dados serão avaliadas em uma etapa futura.

---

## 2. Escopo da versão inicial

A versão inicial contempla:

- Configuração de datasource para Datadog.
- Armazenamento seguro das chaves `DD-API-KEY` e `DD-APPLICATION-KEY`.
- Consulta ao endpoint v1 de busca de monitores.
- Suporte aos endpoints:
  - `/api/v1/monitor/search`
  - `/api/v1/monitor/groups/search`
- Paginação automática usando `metadata.page_count`.
- Query editor com dois modos:
  - `Builder`
  - `Raw query`
- Conversão entre Builder e Raw query.
- Campo para URL da interface web do Datadog.
- Geração de link direto para o monitor no Datadog.
- Retorno em formato de tabela/DataFrame para o Grafana.

---

## 3. Identificação do plugin

O plugin utiliza o seguinte ID:

```json
"id": "itguy-datadog-monitors-datasource"
```

Esse ID deve ser usado também na configuração do Grafana para permitir carregamento de plugin não assinado:

```ini
[plugins]
allow_loading_unsigned_plugins = itguy-datadog-monitors-datasource
```

---

## 4. Configuração do datasource

Ao adicionar o datasource no Grafana, os campos principais são:

| Campo | Descrição | Exemplo |
|---|---|---|
| Datadog API Base URL | URL base da API do Datadog, sem versão | `https://api.datadoghq.com/api` |
| Datadog App Base URL | URL da interface web do Datadog usada para montar links dos monitores | `https://company_org.datadoghq.com` |
| DD-API-KEY | Chave de API do Datadog | armazenada como secret |
| DD-APPLICATION-KEY | Chave de aplicação do Datadog | armazenada como secret |
| Timeout | Timeout das requisições HTTP em milissegundos | `30000` |
| Concurrent sessions | Campo reservado para evolução futura de concorrência | `2` |

### Observação sobre versão da API

A versão da API não é mais selecionável no frontend.  
Para os endpoints de monitores utilizados nesta versão, o plugin sempre usa a API v1.

A rota configurada no `plugin.json` deve montar a URL final como:

```text
<Datadog API Base URL>/v1
```

Exemplo:

```text
https://api.datadoghq.com/api/v1
```

---

## 5. Query padrão

A query padrão definida em `types.ts` é:

```ts
export const DEFAULT_QUERY: Partial<DatadogMonitorsQuery> = {
  queryType: 'monitor',
  datadogQuery: 'status:alert muted:false',
};
```

---

## 6. Query type

O campo `Query type` define qual endpoint será consultado.

| Query type | Endpoint consultado | Descrição |
|---|---|---|
| `monitor` | `/monitor/search` | Consulta monitores |
| `group monitor` | `/monitor/groups/search` | Consulta grupos de monitores |
| `all` | ambos | Consulta os dois endpoints e consolida o resultado |

---

## 7. Query mode

O plugin possui dois modos de construção da query.

### 7.1. Raw query

No modo `Raw query`, o usuário escreve diretamente a query Datadog.

Exemplo:

```text
status:alert muted:false
```

Outros exemplos:

```text
status:(alert OR warn OR "no data") muted:false
type:metric status:alert
type:metric group_status:alert
tag:("env:prod" AND "check_status:live")
```

### 7.2. Builder

No modo `Builder`, o usuário monta a query através de campos pré-definidos.

Campos disponíveis:

| Campo visual | Campo gerado na query | Tipo |
|---|---|---|
| Status | `status` | múltipla seleção |
| Muted | `muted` | seleção simples |
| Priority | `priority` | múltipla seleção |
| Type | `type` | múltipla seleção |
| Env | `env` | campo livre |
| Team | `team` | campo livre |
| Scope | `scope` | campo livre |
| Tag | `tag` | campo livre |
| Extra options | nenhum prefixo automático | campo livre |

### 7.3. Valores de Status

Opções:

```text
alert
warn
no data
ok
```

O valor `no data` deve ser gerado com aspas duplas por conter espaço:

```text
status:"no data"
```

Quando usado com múltiplos valores:

```text
status:(alert OR warn OR "no data")
```

### 7.4. Valores de Priority

Opções:

```text
p1
p2
p3
p4
p5
not_defined
```

### 7.5. Valores de Type

Opções:

```text
synthetics
integration
metric
log
apm
trace-analytics
anomaly
watchdog
composite
custom
event
host
forecast
live_process
network
outlier
process
```

### 7.6. Extra options

O campo `Extra options` permite adicionar filtros que ainda não existem nos campos definidos do Builder.

Exemplo:

```text
service:checkout creator:usuario@empresa.com
```

Esse conteúdo é anexado ao final da query gerada.

---

## 8. Conversão entre Builder e Raw query

O plugin adapta a query ao mudar de modo.

### 8.1. Builder para Raw query

Ao mudar de `Builder` para `Raw query`, o valor exibido em `Generated query` é copiado para o campo `Datadog query`.

Exemplo:

```text
status:alert muted:false priority:p1 type:metric env:prod
```

Passa a ser o conteúdo do campo Raw query.

### 8.2. Raw query para Builder

Ao mudar de `Raw query` para `Builder`, o plugin tenta interpretar os campos conhecidos:

- `status`
- `muted`
- `priority`
- `type`
- `env`
- `team`
- `scope`
- `tag`

O que não for reconhecido é enviado para `Extra options`.

Exemplo:

```text
status:(alert OR "no data") muted:false type:metric env:prod service:checkout
```

Será convertido para:

| Campo | Valor |
|---|---|
| Status | `alert`, `no data` |
| Muted | `false` |
| Type | `metric` |
| Env | `prod` |
| Extra options | `service:checkout` |

A conversão Raw para Builder é feita em modo **best effort**, pois queries livres podem conter expressões avançadas.

---

## 9. Botão Run query

O plugin não executa a query automaticamente a cada mudança de campo no Query Editor.

O usuário deve clicar em:

```text
Run query
```

Também é possível executar pressionando `Enter` no campo Raw query.

Isso evita chamadas desnecessárias ao Datadog enquanto a query ainda está sendo montada.

Atenção: o Grafana ainda pode executar queries automaticamente em situações como:

- abertura do dashboard;
- refresh manual do painel;
- refresh automático configurado no dashboard;
- alteração de time range;
- carregamento inicial do painel.

---

## 10. Funcionamento interno da consulta

Para cada query executada:

1. O usuário seleciona o datasource.
2. O Query Editor monta a query Datadog.
3. O plugin identifica o `Query type`.
4. O plugin chama o Data Source Proxy do Grafana.
5. O Grafana adiciona os headers seguros configurados no `plugin.json`.
6. O Grafana encaminha a requisição para a API do Datadog.
7. O plugin processa a resposta.
8. Se houver mais páginas, o plugin executa o loop de paginação.
9. O plugin consolida os resultados.
10. O plugin retorna um DataFrame para o painel do Grafana.

---

## 11. Paginação

Os endpoints de busca retornam metadados de paginação:

```json
{
  "metadata": {
    "total_count": 100,
    "page": 0,
    "per_page": 100,
    "page_count": 1
  }
}
```

O plugin usa `metadata.page_count` para buscar todas as páginas disponíveis.

O parâmetro `per_page` não fica mais exposto no Query Editor.  
Nesta versão, o valor é fixado internamente em:

```text
100
```

---

## 12. Link para o monitor

O plugin monta o link do monitor usando:

```text
<Datadog App Base URL>/monitors/<monitor_id>
```

Exemplo:

```text
https://company_org.datadoghq.com/monitors/123456
```

Para resultados do endpoint `/monitor/search`, o ID é extraído de:

```text
id
```

Para resultados do endpoint `/monitor/groups/search`, o ID é extraído de:

```text
monitor_id
```

---

## 13. Retorno atual do plugin

A versão inicial retorna os dados com campos básicos, incluindo o JSON original.

Campos principais:

| Campo | Descrição |
|---|---|
| `source` | Origem do dado: `monitor` ou `group_monitor` |
| `endpoint` | Endpoint usado |
| `monitor_id` | ID do monitor |
| `monitor_url` | Link direto para o monitor no Datadog |
| `page` | Página retornada pela API |
| `page_count` | Total de páginas |
| `total_count` | Total de registros informado pelo Datadog |
| `raw_json` | Objeto original retornado pela API |

---

## 14. Desenho funcional

```mermaid
flowchart TD
    A[Usuário no Grafana] --> B[Seleciona datasource Datadog Monitors]
    B --> C[Escolhe Query type]
    C --> D{Query mode}

    D -->|Builder| E[Preenche filtros do formulário]
    E --> F[Generated query]

    D -->|Raw query| G[Escreve query manual]
    G --> H[Datadog query]

    F --> I[Run query]
    H --> I[Run query]

    I --> J{Query type}
    J -->|monitor| K[/monitor/search]
    J -->|group monitor| L[/monitor/groups/search]
    J -->|all| M[/monitor/search + /monitor/groups/search]

    K --> N[Paginação]
    L --> N
    M --> N

    N --> O[Normalização básica]
    O --> P[Adiciona monitor_id e monitor_url]
    P --> Q[Retorna DataFrame]
    Q --> R[Painel/Table no Grafana]
```

---

## 15. Desenho de arquitetura

```mermaid
flowchart LR
    subgraph Browser["Browser do usuário"]
        A[Grafana UI]
        B[Datasource Plugin Frontend<br/>React + TypeScript]
        C[QueryEditor<br/>Builder / Raw query]
    end

    subgraph GrafanaServer["Grafana Server"]
        D[Data Source Proxy]
        E[plugin.json routes]
        F[secureJsonData<br/>DD-API-KEY<br/>DD-APPLICATION-KEY]
    end

    subgraph Datadog["Datadog"]
        G[Datadog API v1]
        H[/monitor/search]
        I[/monitor/groups/search]
    end

    A --> B
    B --> C
    B -->|GET api/datasources/proxy/uid/.../datadog-v1/...| D

    D --> E
    E --> F
    D -->|GET https://api.datadoghq.com/api/v1/...<br/>com headers seguros| G

    G --> H
    G --> I

    H --> D
    I --> D
    D --> B
    B -->|DataFrame| A
```

---

## 16. Segurança

As chaves do Datadog não são enviadas diretamente pelo navegador.

Elas são configuradas como secrets no datasource:

```text
DD-API-KEY
DD-APPLICATION-KEY
```

E inseridas pelo Grafana Data Source Proxy, usando as rotas definidas no `plugin.json`.

Isso reduz o risco de exposição das credenciais no frontend.

---

## 17. Instalação em Grafana 11 no Ubuntu

### 17.1. Build do plugin

No ambiente de desenvolvimento:

```bash
npm install
npm run build
```

A pasta gerada será:

```text
dist/
```

### 17.2. Copiar para o servidor Grafana

No servidor:

```bash
sudo systemctl stop grafana-server

sudo rm -rf /var/lib/grafana/plugins/itguy-datadog-monitors-datasource

sudo mkdir -p /var/lib/grafana/plugins/itguy-datadog-monitors-datasource

sudo cp -r dist/* /var/lib/grafana/plugins/itguy-datadog-monitors-datasource/

sudo chown -R grafana:grafana /var/lib/grafana/plugins/itguy-datadog-monitors-datasource

sudo systemctl start grafana-server
```

### 17.3. Liberar plugin não assinado

Editar:

```bash
sudo nano /etc/grafana/grafana.ini
```

Adicionar ou ajustar:

```ini
[plugins]
allow_loading_unsigned_plugins = itguy-datadog-monitors-datasource
```

Reiniciar:

```bash
sudo systemctl restart grafana-server
```

### 17.4. Limpar cache do navegador

Após atualizar o plugin, usar:

```text
Ctrl + F5
```

ou abrir o Grafana em uma aba anônima.

---

## 18. Troubleshooting

### Plugin não aparece

Verificar:

```bash
sudo find /var/lib/grafana/plugins -name plugin.json -exec grep -H '"itguy-datadog-monitors-datasource"' {} \;
```

### Grafana ainda mostra versão antiga

Possíveis causas:

- cache do navegador;
- build antigo copiado;
- `dist` copiado dentro de uma subpasta `dist`;
- Grafana não reiniciado;
- ID do plugin divergente no `grafana.ini`.

### Conferir logs

```bash
sudo journalctl -u grafana-server -f
```

ou:

```bash
sudo tail -f /var/log/grafana/grafana.log
```

### Conferir configuração salva do datasource

Se o Grafana estiver usando SQLite:

```bash
sudo sqlite3 /var/lib/grafana/grafana.db
```

```sql
select name, type, json_data from data_source where type = 'itguy-datadog-monitors-datasource';
```

---

## 19. Limitações conhecidas desta versão

Esta versão inicial ainda não possui:

- backend em Go;
- cache compartilhado entre usuários;
- cache persistente no servidor;
- enriquecimento com `/api/v1/monitor`;
- controle real de concorrência;
- painel/widget visual customizado;
- logs detalhados no servidor do Grafana com URL final e headers mascarados;
- assinatura oficial do plugin.

---

## 20. Evoluções futuras

Evoluções planejadas ou possíveis:

1. Migrar para backend plugin em Go.
2. Implementar cache compartilhado em memória com TTL.
3. Criar endpoint interno para:
   - status do cache;
   - refresh manual;
   - limpeza do cache.
4. Enriquecer dados usando:
   - `/api/v1/monitor`
   - detalhes por monitor ID, se necessário.
5. Criar painel customizado para visão de monitores.
6. Criar cards de contagem por estado:
   - Critical
   - Alert
   - Warn
   - No data
   - OK
7. Criar tabela semelhante ao Problems do Zabbix, com:
   - severidade;
   - status;
   - nome;
   - tags;
   - grupo;
   - mensagem;
   - link para o monitor;
   - linha expansível com detalhes.
8. Assinar o plugin para uso em produção sem liberação de unsigned plugin.

---

## 21. Resumo

Nesta versão, o plugin funciona como um datasource frontend-only para consultar monitores do Datadog via Grafana Data Source Proxy.

A arquitetura atual é simples e adequada para validar:

- autenticação;
- query builder;
- consulta aos endpoints;
- paginação;
- retorno consolidado;
- links para monitores;
- uso em tabela padrão do Grafana.

Após validação do modelo de dados e da experiência de uso, a evolução natural é migrar para um backend plugin em Go, permitindo cache robusto, enriquecimento detalhado e melhor controle operacional.
