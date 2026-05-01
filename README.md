# Monitor RIC v4

App PWA para monitoramento de Requerimentos de Informação do Congresso
Nacional com menção à Casa Civil. Consome as APIs públicas da Câmara dos
Deputados e do Senado Federal.

## Conteúdo do pacote

```
monitor-ric-v4/
├── index.html      ← o app
├── manifest.json   ← metadata PWA
└── sw.js           ← service worker (cache offline)
```

Os três arquivos precisam estar **na mesma pasta** e ser servidos por HTTP/HTTPS.

## Novidades v4

- **PWA instalável** — adicione à tela inicial do celular ou desktop, funciona offline
- **Modo escuro** — toggle no header (☀️/🌙), respeita preferência do sistema
- **Painel redesenhado** — barra de alertas clicáveis no topo + 4 colunas de acompanhamento
- **Statusbar clicável** — clicar nos números do header aplica filtros imediatos
- **Análise por IA com Gemini** — botão 🤖 no detalhe baixa o PDF do inteiro teor e usa o Gemini para preencher Objeto e Resumo
- **Logo e ícone próprios** embutidos como SVG
- **Botão Voltar** fecha modais sem sair do app
- **Contador de filtros em destaque** com chips removíveis
- **"Aguardando Envio ao Executivo" = Aprovado** — detectado em todas as variações
- **Paleta moderna** — slate + índigo

## Deploy no GitHub Pages

### 1. Criar repositório
- Acesse https://github.com/new
- Nome: `monitor-ric` (ou outro)
- Visibilidade: **público** (Pages free) ou privado (precisa GitHub Pro)
- Clique em **Create repository**

### 2. Subir os arquivos
**Pelo navegador:**
- No repositório, **Add file → Upload files**
- Arraste `index.html`, `manifest.json`, `sw.js`
- Escreva mensagem de commit e **Commit changes**

**Pela linha de comando:**
```bash
git clone https://github.com/SEU-USUARIO/monitor-ric.git
cd monitor-ric
# Copie os três arquivos para esta pasta
git add index.html manifest.json sw.js
git commit -m "Versão inicial Monitor RIC"
git push
```

### 3. Habilitar GitHub Pages
- **Settings** → **Pages**
- Em **Source**: Deploy from a branch
- Em **Branch**: `main` / `/ (root)`
- **Save**
- Aguarde 1–2 minutos. URL: `https://SEU-USUARIO.github.io/monitor-ric/`

### 4. Acessar e instalar
- Abra a URL no navegador
- Celular: "Adicionar à tela inicial"
- Desktop Chrome/Edge: ícone de instalação na barra de endereço, ou banner no próprio app

### 5. Migrar dados das versões anteriores
Se você usou versões anteriores localmente (`file://` ou `localhost`), os dados ficam vinculados àquele domínio — não migram automaticamente para o GitHub Pages.

**Para migrar:** abra a versão antiga, **⚙ Configurações → Exportar backup (JSON)**, salve o arquivo. Abra a v4 no GitHub Pages, **⚙ Configurações → Importar backup**.

## Configuração inicial

### Chave Gemini (opcional)
Para análise automática de PDFs:
1. Gere chave em https://aistudio.google.com/apikey
2. **⚙ Configurações → 🤖 API Gemini**
3. Cole a chave, escolha modelo (recomendado: `gemini-2.5-flash`)

Chave fica só no IndexedDB do seu navegador.

### Proxy CORS
Se sua rede bloquear, em **⚙ Configurações → Proxy CORS**:
```
https://corsproxy.io/?url={url}
```

## Uso recomendado

1. **Sincronização inicial**: ⟳ Sincronizar → ano corrente → "Enriquecer" → aguarde 1–3 min
2. **Triagem diária**: clique nos pills da barra de alertas no Painel
3. **Análise rápida**: ★ na tabela para marcar relevantes; 🤖 Gemini no detalhe para preencher Objeto/Resumo
4. **Exportação**: Aba Requerimentos → filtre → CSV ou XLSX

## Limitações conhecidas

- **Detecção Senado depende de regex sobre texto livre** — situações não mapeadas ficam registradas em **Configurações** para revisão
- **PDF Gemini limitado a ~18 MB** — RICs muito longos podem falhar
- **Endpoint legado do Senado** (`/materia/pesquisa/lista`) marcado como descontinuado mas continua respondendo

## APIs consumidas

- Câmara: `dadosabertos.camara.leg.br/api/v2/proposicoes`
- Senado: `legis.senado.leg.br/dadosabertos/materia/{pesquisa,atualizadas,movimentacoes,textos}`
- Gemini (opcional): `generativelanguage.googleapis.com/v1beta`

## Arquitetura

- HTML/CSS/JS puro, ~110 KB
- IndexedDB: `monitor-ric` (schema v3, migra automático de v1/v2/v3)
- SheetJS via CDN para XLSX
- Service Worker: cache-first do shell, passthrough das APIs
