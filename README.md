# Monitor RIC 2.0

Acompanhamento de Requerimentos de Informação (RIC, RQS, REQ) do Congresso Nacional
com relevância para a Casa Civil da Presidência da República.

Aplicação web instalável (PWA) de uso interno da Subsecretaria de Governança Pública
(SSGP), Secretaria Executiva da Casa Civil.

---

## O que faz

Coleta requerimentos nas APIs abertas da Câmara dos Deputados e do Senado Federal,
filtra os que mencionam a Casa Civil, enriquece cada um com tramitação, autoria e
situação legislativa, e permite que a equipe registre a análise interna: objeto,
temática, unidades consultadas, etapas do fluxo, NUPs do SEI, prazos e resposta.

Três telas: **Painel** (indicadores e gráficos), **Gerencial** (visões de
acompanhamento) e **Requerimentos** (lista, filtros e edição). Gera relatórios e
boletins em Word e PDF.

Vários usuários trabalham sobre a mesma base, ao mesmo tempo, com atualização ao vivo.

---

## Arquitetura em uma página

```
  navegador                          nuvem                       fontes
  ---------                          -----                       ------
  index.html  ──── leitura/escrita ──▶  Supabase              Câmara (API v2)
  (arquivo                              PostgreSQL 16   ◀───── Senado (dados abertos)
   único)     ◀─── Realtime (WS) ─────  + RLS + Auth
      │                                     ▲                  Google Gemini
      │                                     │                  (análise de PDF)
      ▼                              Edge Functions
  IndexedDB                          admin-usuarios
  (espelho de                        baixar-pdf
   leitura)
```

**Fonte da verdade é o Supabase.** O IndexedDB é espelho de leitura: reescrito a cada
leitura da nuvem e a cada evento de Realtime. Serve para a tela não ficar vazia e para
a consulta continuar funcionando quando a rede oscila. **Sem conexão, a edição é
bloqueada**, com aviso: não existe fila de reenvio, e permitir digitar sem gravar seria
perda silenciosa.

### Camadas no `index.html`

| Bloco | Papel |
|---|---|
| `DB` | IndexedDB (`monitor-ric`, versão 3, stores `proposicoes`, `marcacoes`, `config`, `naomapeadas`) |
| `Nuvem` | Cliente Supabase: auth, leitura, gravação campo a campo, Realtime, Edge Functions |
| Coleta | `sincronizar`, `sincronizarIncremental`, `reenriquecerExistentes`, `incluirRequerimentoManual` |
| Relatórios | Presets, escopo, geração em Word (`docx`) e PDF (`window.print()` em iframe) |
| XLSX | Importação e conciliação da planilha Controle RICs.xlsx |

---

## Restrições do projeto

Não são preferências, são decisões firmes. Mudar qualquer uma delas é uma decisão de
arquitetura, não um detalhe de implementação.

1. **Arquivo único, sem toolchain de build.** Todo o app é `index.html`. Sem npm, sem
   bundler, sem etapa de compilação. O que sobe para o servidor é o que se edita.
2. **Nada de invenção.** Nome de coluna vem do schema real do banco. Nome de campo de
   API vem de resposta real. Ambiguidade de regra de negócio é decidida por pessoa, não
   pelo código.
3. **`service_role` nunca aparece no app, em backup nem em conversa.** A chave pública
   (`anon` / publishable) no `index.html` é pública por projeto: quem protege os dados é
   o RLS. Operações que exigem privilégio ficam nas Edge Functions.
4. **Migrações idempotentes.** Rodar duas vezes não pode causar dano.
5. **Validar antes de entregar:** checagem de sintaxe JS e balanço de tags HTML em toda
   alteração, com backup do arquivo anterior.

---

## Modelo de dados

Onze tabelas em `public`, todas com RLS ligado e política para o papel `authenticated`.

| Tabela | Papel |
|---|---|
| `proposicoes` | O requerimento como vem da API. PK `id` (chave natural composta) |
| `marcacoes` | A análise interna. Relação **1:1** com `proposicoes` |
| `marcacao_unidades` | Junção: unidades consultadas por requerimento |
| `unidades`, `tematicas`, `tipos_resposta` | Listas de referência |
| `situacao_mapa` | De-para de situação bruta para categoria INFOCO |
| `nao_mapeadas` | Situações vistas e ainda sem de-para |
| `config_compartilhada` | Configurações por conta e da equipe |
| `snapshots_import`, `auditoria_exclusoes` | Rastro de importação e de exclusão |

### Chave natural das proposições

```
camara-{idApi}          senado-{codigoMateria}
manual-{sigla}-{numero}-{ano}      (sufixo -b em duplicata)
cn-RIC-{numero}-{ano}   cldf-RIC-{numero}-{ano}
```

### Gatilhos que o app depende (e não substitui)

| Gatilho | Efeito |
|---|---|
| `trg_par_marcacao` | Cria a marcação 1:1 no INSERT de uma proposição. **O app nunca envia marcação na coleta** |
| `trg_auditoria_exclusao` | Registra em `auditoria_exclusoes` antes do DELETE |
| `trg_touch_*` | Mantém `atualizado_em` |

### Realtime

Publicação `supabase_realtime` cobre `proposicoes`, `marcacoes`, `marcacao_unidades` e
`config_compartilhada`. O app assina as duas primeiras.

---

## Armadilhas conhecidas

Cada item aqui custou tempo para ser descoberto. Ler antes de mexer.

**`supabase-js` está fixado em `2.79.0`.** Versões posteriores têm uma regressão de ESM
que quebra o import direto do CDN em ambiente sem bundler. Não atualizar sem testar no
navegador.

**"Aprovado" não é estado terminal.** Só `respondido` e `retirado` são. Um requerimento
aprovado continua tramitando (vira aguardando resposta, depois respondido) e precisa ser
sempre re-checado na API. Tratá-lo como final congela a situação.

**Ids com "/" são legítimos.** 49 proposições (cn, cldf, senado) usam `id_original` no
formato "numero/ano". Nenhuma validação nem constraint pode rejeitá-los. Cuidado para
não confundir com a função `_idOriginalValido`, que rejeita "/" **de propósito e por
outro motivo**: ali a pergunta é se aquele valor serve como identificador numérico da
API, e "143/2025" não serve. Rejeitá-lo é o que faz o enriquecimento resolver o id real.

**Espaço nas pontas é invisível e quebra tudo.** Já houve 783 registros com
`"Aguardando Resposta "` que não casavam no de-para, e o defeito só apareceu com
`repr()`. Hoje há duas defesas: `normalizarTextosProposicao()` na entrada e `CHECK` de
`btrim` no banco em `situacao_legislativa`, `status_interno` e `etapa`. Um único valor
com espaço faz o PostgREST recusar **o lote inteiro** do upsert.

**PGRST102, "All object keys must match".** O upsert em lote do PostgREST exige que
todos os registros do mesmo lote tenham exatamente o mesmo conjunto de chaves. Por isso
`linhaDeProposicao()` e `linhaDeMarcacao()` sempre devolvem todas as chaves, com `null`
onde não há valor. Nunca montar a linha só com os campos preenchidos.

**Escrita é sempre campo a campo.** A edição envia apenas as colunas que mudaram, para
que dois colegas editando campos diferentes do mesmo requerimento não se sobrescrevam.
Campo ausente no registro enviado significa **não editado**, nunca **apagado**: é isso
que protege colunas que a tela não exibe (`oficio`, `atribuicao`, os links). Todo
`UPDATE` usa `.select()` e confere que voltou linha, porque negativa de RLS retorna
sucesso com zero linhas e a perda seria silenciosa.

**O botão "Atualizar banco na nuvem (upload)" sobrescreve.** Ele envia a base local
inteira por cima da nuvem. É o caminho da carga da planilha Controle RICs.xlsx e por
isso continua existindo, mas é **restrito ao administrador**: se um colega editar depois
da sua última atualização de dados, o envio desfaz o trabalho dele sem erro. Atualizar
antes de enviar.

**As APIs mudam de estrutura sem aviso.** A do Senado já migrou de schema no meio do
projeto e `/materia/movimentacoes` mudou de forma. Validar nome de campo contra resposta
real antes de escrever código.

**Rede institucional.** `api.github.com` tem histórico de indisponibilidade na rede da
Casa Civil (foi o que aposentou o antigo CloudSync por Gist). `github.io` e
`*.supabase.co` são alcançáveis. Se o WebSocket do Realtime for bloqueado, o app segue
funcionando e só atualiza quando a página é recarregada, sem erro visível.

---

## Publicação

Hospedado no GitHub Pages. Não há build: publicar é commitar o `index.html`.

```
index.html        o aplicativo inteiro
manifest.json     PWA
sw.js             service worker (cache offline)
icon-72.png  icon-192.png  icon-512.png
```

Ao alterar o `index.html`, conferir se o `sw.js` precisa ter a lista de precache
atualizada. Como não há toolchain, essa sincronia é manual.

Depois de publicar, recarregar com Ctrl+Shift+R (ou fechar e reabrir o PWA) para o
service worker pegar a versão nova.

### Configuração no `index.html`

```js
const SUPABASE_URL      = "https://<projeto>.supabase.co";
const SUPABASE_ANON     = "sb_publishable_...";   // pública por projeto, RLS protege
const SUPABASE_JS_VERSAO = "2.79.0";              // fixada, ver Armadilhas
```

A chave do Google Gemini não fica no código: cada usuário grava a sua na própria conta,
em `config_compartilhada`, com chave `geminiKey:<uid>`.

### Edge Functions

| Função | Por quê |
|---|---|
| `admin-usuarios` | Criar, listar, redefinir senha, mudar papel e excluir contas. Usa `service_role` **no servidor** e confere que quem chamou é admin |
| `baixar-pdf` | Baixa o inteiro teor pelo servidor. Necessária porque `camara.leg.br` e `senado.leg.br` não enviam cabeçalhos CORS |

---

## Operação

### Papéis

Administrador (`app_metadata.role = "admin"`, definido só pela Edge Function) pode
gerenciar contas e usar o envio em bloco. Os demais usuários leem e editam normalmente.

### Rotina de coleta

- **Sincronização rápida** (botão do cabeçalho): incremental dos últimos dias.
  Descobre requerimentos novos e reverifica a tramitação dos já existentes.
- **Coleta por ano**: varredura completa de um ano, por casa.
- **Incluir requerimento**: traz um RIC específico por Casa, tipo, número e ano, quando
  ele não é capturado pelos critérios de busca.

Toda coleta grava no espelho local e envia ao banco em bloco no fim, o que tolera queda
de rede no meio. O upsert é por chave primária: **recoletar atualiza e nunca duplica**.
Se o envio falhar, rodar a coleta de novo é o remédio.

### Conferência de integridade

`conferencia-final.sql` (somente leitura) devolve, em uma consulta, as contagens, a
distribuição por situação, os ids com "/", os campos com espaço nas pontas, a relação
1:1 e os vínculos de unidade. O bloco `deve_ser_zero_ou_true` é onde olhar primeiro.

Referência de sanidade: proposições e marcações em número igual, zero órfãs, zero
espaços nas pontas, zero slugs fora do cadastro.

---

## Histórico da migração

O app nasceu como PWA local com sincronização por GitHub Gist. A migração para Supabase
foi feita em fases:

| Fase | O que entregou |
|---|---|
| 0 a E | Inventário do schema a partir de backup real, DDLs idempotentes, seeds |
| F | Carga inicial, leitura do Supabase, base local vira espelho, login |
| G | Gravação campo a campo e colaboração ao vivo (Realtime) |
| H | Coleta e relatórios contra o banco novo |
| I | Remoção dos resíduos do sistema antigo e conferência final |

O CloudSync por Gist e a criptografia associada foram removidos por completo.

---

## Licença e uso

Ferramenta de uso interno da Casa Civil da Presidência da República. Não se destina a
distribuição pública nem a uso fora do contexto institucional para o qual foi feita.

Os dados legislativos vêm de APIs públicas da Câmara dos Deputados e do Senado Federal.
A análise interna registrada no sistema é informação de trabalho da SSGP.
