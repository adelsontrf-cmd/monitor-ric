# Monitor RIC

Aplicativo PWA (Progressive Web App) da SSGP/SE/Casa Civil para monitorar os **Requerimentos de Informação** (RIC, RQS, REQ) do Congresso Nacional que mencionam a Casa Civil, controlando sua tramitação interna, prazos e respostas. Consome as APIs públicas de Dados Abertos da Câmara dos Deputados e do Senado Federal. Funciona offline e é instalável como app.

**Versão atual: 4.7.8**

## Arquivos do pacote

```
monitor-ric-v4.7.8/
├── index.html               ← o app (arquivo único)
├── manifest.json            ← metadata PWA
├── sw.js                    ← service worker
├── icon-72.png              ← ícone 72x72
├── icon-192.png             ← ícone 192x192
├── icon-512.png             ← ícone 512x512
└── icon-512-maskable.png    ← ícone maskable Android
```

Os 7 arquivos precisam estar na mesma pasta e ser servidos via HTTPS.

## Funcionalidades

### Sincronização com o Congresso

- Sincronização com as APIs da Câmara e do Senado, por ano completo ou incremental (até 180 dias).
- Enriquecimento automático: ementa, autoria (com partido/UF), tramitação, situação legislativa, inteiro teor e prazo final CN extraído do histórico.
- A sincronização incremental também reenriquece os RICs já existentes na base — inclusive os adicionados pela importação da planilha que não atendem ao filtro de menção à Casa Civil.
- Inclusão manual de requerimentos por número/ano, com busca na API e preenchimento automático quando encontrado (ou criação em branco para completar à mão).

### Triagem e análise

- Para cada RIC: objeto, resumo, temática, relevância, observações e unidades consultadas.
- Mudança automática de status interno ao salvar: ao preencher o objeto, passa para "Em tramitação no Congresso Nacional"; ao registrar a data de recebimento, para "Em andamento na Casa Civil"; ao registrar a data da resposta, para "Respondido". O campo permanece editável (para casos de retirada).
- Análise assistida por IA (Google Gemini) do inteiro teor, preenchendo objeto, resumo e palavras-chave.
- Busca de RICs análogos por afinidade temática (TF-IDF, 100% no navegador).
- Edição em lote: aplica etapa, prazo da etapa, temática, processo de recebimento, data e tipo de resposta a vários RICs de uma vez, com filtros de prazo de resposta e etapa atual no seletor.

### Controle de prazos

- Cálculo automático dos prazos das etapas internas conforme o art. 50, § 2º da Constituição Federal e a regra de contagem dos arts. 224 e 231 do CPC (30 dias, excluído o dia inicial, prorrogando o vencimento em dia não útil).
- Prazo da etapa atual refletido em campo dedicado no modal de detalhe, que acompanha a etapa em curso.

### Painéis e gráficos (aba Painel)

- Cards de indicadores e gráficos: situação legislativa, etapas em andamento na Casa Civil, prazo final CN em andamento, casa parlamentar e evolução mensal.
- Na situação legislativa, "Apresentados (últimos 7 dias)" é uma categoria própria, e RICs com data de resposta registrada são contabilizados como Respondidos (corrigindo registros defasados da API).
- Os gráficos restritos a "em andamento na Casa Civil" ficam ocultos quando não há RICs nesse estado.
- Gráficos clicáveis filtram a aba Requerimentos.

### Relatórios

- Geração em Word (.docx) e PDF, com seleção de campos, organização, presets nativos e presets de usuário.
- Fonte sans-serif, orientação paisagem por padrão, links de inteiro teor e página oficial como URL ou botão clicável.

### Importação e exportação

- Importação da planilha `Controle_RICs.xlsx` (aba "Controle RI", 27 colunas) com merge inteligente: só marcações são atualizadas, nada é removido, e os campos sem correspondência na planilha (palavras-chave e RICs análogos) são preservados; duplicidades da base são mantidas.
- Ao importar, é possível exportar um TXT com os RICs que estão na base mas não constam no XLSX, ou ocultá-los da base (sem apagar) com um clique.
- A coluna "Etapa" da planilha é correlacionada com as etapas internas do app: Admissibilidade, Subsídios, Conformidade e Validação SSGP viram a etapa atual (com as anteriores marcadas como concluídas e o "Prazo da etapa" registrado); Respondido e Cancelado/Retirado fecham todo o fluxo; e "No Congresso"/"No Congresso - Novo", por serem anteriores ao recebimento na Casa Civil, não geram etapas internas.
- Exportação para XLSX no mesmo formato do `Controle_RICs.xlsx`, com seleção de RICs.
- Exportação CSV da aba Requerimentos.

### Sincronização da base na nuvem (CloudSync)

- Sincronização single-user via GitHub Gist privado, cifrada de ponta a ponta (AES-GCM 256, chave derivada por PBKDF2-SHA256 do PAT + Gist ID, com gzip antes de cifrar).
- Indicador de estado no cabeçalho; sincronização automática em segundo plano e ao abrir; exportação/importação de configuração para ativar outros computadores com um único paste.
- Sincroniza todos os dados (inclusive RICs ocultos e excluídos, para recuperação em qualquer dispositivo) e todas as configurações e presets de relatório, exceto as credenciais do próprio CloudSync, a chave do Gemini e o tema (local por navegador).
- Requer que a rede permita acesso a `api.github.com`. Recomenda-se token clássico do GitHub com escopo `gist` (mais confiável que fine-grained para Gists).

### PWA

- Instalável como app (WebAPK no Android). Funciona offline via service worker (cache-first do shell, passthrough das APIs).
- Tema claro/escuro, com preferência local por navegador (padrão claro).

## Deploy no GitHub Pages

### Pelo GitHub Desktop

1. Abrir o GitHub Desktop e abrir o repositório `monitor-ric`.
2. Copiar os 7 arquivos para a pasta local, substituindo as versões anteriores.
3. **Summary** = "Atualização para v4.7.8", **Commit to main**, depois **Push origin**.
4. Aguardar 1–2 minutos. A URL `https://SEU-USUARIO.github.io/monitor-ric/` estará atualizada.

### Pela linha de comando

```bash
cd ~/seu-repo/monitor-ric
# Copie os 7 arquivos para esta pasta
git add index.html manifest.json sw.js icon-*.png
git commit -m "v4.7.8"
git push
```

### Cache do PWA

A v4.7.8 usa o cache `monitor-ric-v4-7-8`. O service worker invalida o cache anterior automaticamente ao atualizar. Se necessário no Android: Configurações → Apps → Monitor RIC → Armazenamento → Limpar cache, e reabrir. Ou desinstalar e reinstalar pela URL.

## Configuração inicial

### Sincronização da base na nuvem (opcional)

1. No GitHub: Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token (classic), marcando apenas o escopo **gist**.
2. No app: menu → **Sync base na nuvem** → cole o token → **Testar conexão** → **+ Criar novo Gist** → **Salvar configuração**.
3. Em outros computadores, use **Exportar configuração** aqui e **Importar e ativar** lá.
4. Em computador compartilhado, clique em **Desconectar** ao terminar.

### Manutenção de dados

Em **Configurações → Manutenção de dados**, o botão "Executar manutenção completa" roda rotinas idempotentes de correção: cria marcações para proposições que não tenham (invariante 1:1), normaliza as unidades consultadas para os valores canônicos (preservando e listando as que não tiverem correspondência) e recalcula a etapa a partir do fluxo. As mudanças sincronizam normalmente depois.

### Backup seguro

O backup é exportado **sem credenciais** por padrão (PAT do GitHub e chave Gemini ficam de fora), para poder ser compartilhado com segurança. Há uma opção para incluí-las quando o arquivo for guardado em local seguro.

### Chave Gemini (opcional)

1. Gere a chave em https://aistudio.google.com/apikey
2. Menu → **Configurações → API Gemini**, cole a chave e escolha o modelo (recomendado `gemini-2.5-flash`).

A chave fica apenas no navegador (IndexedDB) e não é sincronizada na nuvem.

### Proxy CORS (opcional)

Se a rede bloquear chamadas diretas às APIs do Congresso, em **Configurações → Proxy CORS**:

```
https://corsproxy.io/?url={url}
```

## Uso recomendado

1. **Sincronização inicial**: menu → Sync API Congresso → ano corrente → "Enriquecer".
2. **Triagem**: aba Gerencial e aba Requerimentos com os filtros (incluindo Prazo final CN).
3. **Análise**: no detalhe de um RIC, preencha objeto/resumo (ou use o Gemini) e salve.
4. **Relatórios**: aba Requerimentos → filtre → gere o relatório em Word/PDF.
5. **Backup/multi-dispositivo**: configure a Sync base na nuvem.

## APIs consumidas

- Câmara: `dadosabertos.camara.leg.br/api/v2/proposicoes`
- Senado: `legis.senado.leg.br/dadosabertos/materia/...`
- GitHub Gist (CloudSync): `api.github.com/gists`
- Gemini (opcional): `generativelanguage.googleapis.com/v1beta`

## Arquitetura

- HTML/CSS/JS puro, arquivo único (~478 KB).
- IndexedDB: `monitor-ric` (schema/DB_VERSION 2, com store de tombstones para o CloudSync).
- SheetJS (CDN) para XLSX; docx via biblioteca para relatórios Word.
- Web Crypto API (AES-GCM, PBKDF2) para a criptografia do CloudSync.
- Service Worker: cache-first do shell, passthrough das APIs externas.
- Busca de análogos em TF-IDF, sem dependências externas.

## Limitações conhecidas

- A detecção da situação legislativa por regras textuais pode não cobrir 100% dos casos; situações novas ficam registradas em Configurações → Situações não-mapeadas.
- A busca por número/ano na inclusão manual é limitada no Senado; quando não há correspondência, o RIC é criado em branco para preenchimento manual.
- O CloudSync depende de acesso a `api.github.com`; redes corporativas que bloqueiam esse domínio impedem a sincronização (o site `github.com` abrir não garante que a API esteja liberada).
- A análise por Gemini tem limite de tamanho de PDF; RICs muito longos podem falhar.
