# Monitor RIC v4.2

App PWA para monitoramento de Requerimentos de Informação do Congresso
Nacional com menção à Casa Civil. Consome as APIs públicas da Câmara
dos Deputados e do Senado Federal.

## Arquivos do pacote

```
monitor-ric-v4.2/
├── index.html               ← o app
├── manifest.json            ← metadata PWA
├── sw.js                    ← service worker
├── icon-192.png             ← ícone 192x192
├── icon-512.png             ← ícone 512x512
└── icon-512-maskable.png    ← ícone maskable Android
```

Os 6 arquivos precisam estar na mesma pasta e ser servidos via HTTPS.

## Novidades da v4.2

### Correções

- **Detecção do Senado reescrita** — agora reconhece corretamente
  aprovação pela Comissão Diretora ("Comissão Diretora do Senado
  Federal deferiu"), resposta recebida ("contendo informações ao
  Requerente"), arquivamento ("A matéria vai ao arquivo") e prazos
  ("Prazo para resposta: DD/MM/YYYY").
- **"Aguardando Envio ao Executivo" agora é detectado como Aprovado**
  em todas as variações ("Aguardando Envio ao Poder Executivo",
  "Ag. Envio ao Executivo").
- **Prazo final CN extraído do histórico de tramitação** (em vez de
  calcular como SEI+30). Câmara: "Prazo para Resposta Externas
  (de DD/MM/YYYY a DD/MM/YYYY)". Senado: "Prazo para resposta:
  DD/MM/YYYY". Sugerido editável no modal.
- **Bugs da v4.1 corrigidos**: erro de inicialização ("Cannot set
  properties of null"), regex não-definidas, painel zerado, click
  no painel não abria modal, pills sumindo da barra de alertas.

### UX e fluxo

- **Campo "Objeto (apelido)" unificado** (substitui Apelido + Objeto
  separados, máx. 150 caracteres).
- **Painel de acompanhamento simplificado**: 2 colunas — "Em andamento
  CC / Aguardando resposta" (combinada) + "Aprovados" com seletor
  7d/15d/30d/Todos.
- **Lógica combinada precisa**: status interno tem precedência. Se
  você marca "Em andamento CC", "Respondido" ou "Retirado/Não enviado",
  o item sai da contagem de "Aguardando resposta" automaticamente —
  mesmo que a API ainda mostre situação antiga.
- **Bloco "Aprovados" → opção "Todos"** lista aprovados antigos que
  ainda não passaram para Aguardando resposta nem para Em andamento
  na CC (útil para identificar aprovados sem encaminhamento).
- **Painéis sem ementa**. Mostram apenas o "Objeto (apelido)" quando
  preenchido. Os demais dados (autor, prazo CN, identificação) ficam.
- **Tabela com Prazo CN visível** ao lado do Prazo Etapa.
- **Filtros ocultáveis na aba Requerimentos** (botão ▼ Filtros).
  Persistente em localStorage. Default: ocultos em telas estreitas.
- **Sync incremental até 180 dias** (era 60).
- **Stat "Vencidos" e coluna "Prazo vencido" removidos** (filtro de
  prazo na aba Requerimentos foi mantido).

### Gemini

- **Confirmação de sobrescrita** antes de chamar a API. Lista os
  campos preenchidos que serão substituídos.
- **Fallback para upload manual** quando o servidor bloqueia o
  download automático por CORS. Aparece dropzone inline para
  arrastar o PDF baixado manualmente — sem segundo clique, sem
  modal extra.
- **Prompt atualizado** com regras explícitas: apelido até 150
  caracteres sem mencionar destinatário; resumo até 700 caracteres
  com 20% reservados para alegações do autor; palavras-chave
  3-6 termos.
- Os campos preenchidos pela IA permanecem editáveis. Só ficam
  salvos no banco ao clicar em "Salvar análise".

### Buscar RICs análogos (TF-IDF)

- **Botão 🔍 no modal de detalhe** abaixo do histórico de tramitação.
- Habilitado quando há palavras-chave ou objeto preenchidos.
- Busca outros RICs com afinidade temática usando TF-IDF + cosseno.
- Roda 100% no navegador (sem chamada à API). ~200ms para 1000 RICs.
- Resultados em janela com scroll próprio: identificação, badge da
  casa, score de similaridade. Clique abre o detalhe do análogo.

### PWA Android

- **Manifest com ícones PNG reais** (192, 512, 512-maskable).
- `display: standalone` + `display_override` + `orientation:
  portrait` + `id`: `/monitor-ric/`. Atende aos critérios do Chrome
  para instalação como **WebAPK** (app Android nativo) — não como
  atalho do Chrome.
- **App não gira para paisagem** automaticamente quando instalado.

## Deploy no GitHub Pages

### Pelo GitHub Desktop

1. Abrir o GitHub Desktop. Clonar o repositório `monitor-ric` (se
   já existe) ou criar um novo.
2. Copiar os 6 arquivos para a pasta local do repositório,
   substituindo as versões anteriores.
3. No GitHub Desktop: **Summary** = "Atualização para v4.2",
   **Commit to main**, depois **Push origin**.
4. Aguardar 1–2 minutos. A URL `https://SEU-USUARIO.github.io/
   monitor-ric/` estará atualizada.

### Pela linha de comando

```bash
cd ~/seu-repo/monitor-ric
# Copie os 6 arquivos para esta pasta
git add index.html manifest.json sw.js icon-*.png
git commit -m "v4.2"
git push
```

### Cache do PWA

A v4.2 muda o nome do cache para `monitor-ric-v4-2`. O service
worker invalida o cache anterior automaticamente quando atualiza.
Em alguns dispositivos Android pode ser necessário:

1. Abrir o app instalado.
2. Configurações do Android → Apps → Monitor RIC → Armazenamento
   → Limpar cache.
3. Reabrir o app.

Ou, mais simples: desinstalar e reinstalar pela URL.

## Configuração inicial

### Chave Gemini (opcional)

Para análise automática de PDFs:
1. Gere chave em https://aistudio.google.com/apikey
2. **⚙ Configurações → 🤖 API Gemini**
3. Cole a chave, escolha o modelo (recomendado: `gemini-2.5-flash`)

A chave fica apenas no IndexedDB do navegador. Nunca é enviada a
servidores além do próprio Google.

### Proxy CORS (opcional)

Se sua rede bloquear chamadas diretas às APIs do Congresso, em
**⚙ Configurações → Proxy CORS**:
```
https://corsproxy.io/?url={url}
```

## Migração das versões anteriores

Automática:
- Banco antigo `monitor-sic` → `monitor-ric` (cópia automática
  na primeira abertura).
- Schema sobe de v3 → v4: campo `objeto` é movido para `apelido`
  (preservando o conteúdo) e zerado.
- Campo `prazoFinalCNSugerido` adicionado às proposições. Será
  preenchido na próxima sincronização ou no reenriquecimento.

**Recomendação**: após primeira abertura da v4.2, vá em
**⟳ Sincronizar → Reenriquecer existentes** para reclassificar
todos os itens com a nova lógica do INFOCO + extrair prazos do
histórico.

## Uso recomendado

1. **Sincronização inicial**: ⟳ Sincronizar → ano corrente →
   "Enriquecer" → aguarde 1–3 min.
2. **Triagem diária**: clique nos pills da barra de alertas no
   Painel.
3. **Análise rápida**: ★ na tabela para marcar relevantes;
   🤖 Gemini no detalhe para preencher Objeto/Resumo/Palavras-chave.
4. **Buscar análogos**: no detalhe de um RIC, depois de preencher
   palavras-chave e objeto, clique em 🔍 Buscar análogos.
5. **Exportação**: Aba Requerimentos → filtre → CSV ou XLSX.

## Limitações conhecidas

- Detecção do Senado por regex textuais ainda pode não cobrir
  100% dos casos. Situações novas que aparecerem ficam
  registradas em **Configurações → Situações não-mapeadas**
  para revisão.
- PDF Gemini limitado a ~18 MB. RICs muito longos podem falhar.
- Endpoint legado `/materia/pesquisa/lista` do Senado continua
  respondendo apesar de marcado como descontinuado.
- Busca de análogos depende da qualidade do preenchimento de
  palavras-chave e objeto. É busca léxica (TF-IDF), não
  semântica — sinônimos e paráfrases não batem perfeitamente.
  v5 trará embeddings semânticos via Gemini.

## APIs consumidas

- Câmara: `dadosabertos.camara.leg.br/api/v2/proposicoes`
- Senado: `legis.senado.leg.br/dadosabertos/materia/...`
- Gemini (opcional): `generativelanguage.googleapis.com/v1beta`

## Arquitetura

- HTML/CSS/JS puro, ~157 KB.
- IndexedDB: `monitor-ric` (schema v4).
- SheetJS via CDN para XLSX.
- Service Worker: cache-first do shell, passthrough das APIs.
- TF-IDF: ~150 linhas de JS puro, sem dependências.
