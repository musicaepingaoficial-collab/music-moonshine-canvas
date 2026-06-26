## Objetivo

Na página de Usuários do admin, permitir:
1. **Marcar/selecionar** quais usuários já receberam mensagem de recuperação via WhatsApp (com data e por qual admin).
2. Ao clicar no ícone do WhatsApp, abrir um **diálogo com 5 modelos de mensagem** prontos, com opção de **editar antes de enviar** e escolher um para abrir no WhatsApp Web/App.

Sem mudar o fluxo de e-mail de recuperação atual.

---

## 1. Banco de dados (migration)

### Tabela `whatsapp_recovery_log`
Registra cada envio manual de mensagem de recuperação por WhatsApp.

```
id uuid PK
user_id uuid -> profiles.id (cascade)
sent_by uuid -> auth.users (admin que enviou)
template_id text         -- ex: 'modelo_1'
message text             -- texto final enviado (após edição)
sent_at timestamptz default now()
```
+ índice em `user_id`, `sent_at desc`.
+ GRANT para `authenticated` e `service_role`.
+ RLS: SELECT/INSERT apenas para admins (`has_role(auth.uid(),'admin')`).

### Tabela `whatsapp_recovery_templates`
Modelos editáveis pelo admin (começa com 5 seeds). Permite trocar texto sem deploy.

```
id text PK              -- 'modelo_1' ... 'modelo_5'
title text              -- nome curto exibido no diálogo
body text               -- texto com placeholders {nome}, {primeiro_nome}
order_index int
active bool default true
updated_at timestamptz
updated_by uuid
```
+ GRANT + RLS admin-only para escrita; SELECT autenticado.
+ Seed dos 5 modelos iniciais (reativação, oferta, prova social, urgência, suporte pessoal).

---

## 2. Backend / dados

Sem edge function nova. A página admin lê/escreve direto via Supabase client (já é admin-gated).

Query principal de usuários ganha um join leve:
- `last_whatsapp_recovery_at` (máximo de `sent_at` por user) — feito com `useQuery` separado que retorna `Map<user_id, {sent_at, template_id}>` e é mesclado no render. Evita N+1.

---

## 3. UI — `src/pages/admin/AdminUsuariosPage.tsx`

### Coluna/badge "Recuperação WhatsApp"
- Se nunca enviado: badge cinza "Não contactado".
- Se já enviado: badge verde com data relativa ("há 2d") + tooltip com modelo usado e admin.
- Botão WhatsApp atual passa a **abrir o diálogo** em vez de ir direto ao `wa.me`.

### Filtro
Novo `Select` no topo: "Todos / Já contactados / Não contactados / Contactados há +7d". Filtra em memória usando o mapa acima.

### Seleção em massa (opcional, mesma feature)
- Checkbox por linha + checkbox "selecionar todos".
- Botão "Marcar como contactado" (registra log sem abrir WhatsApp — para casos em que a mensagem foi enviada por outro canal).

---

## 4. Novo componente — `src/components/admin/WhatsAppRecoveryDialog.tsx`

Diálogo aberto pelo ícone WhatsApp. Props: `user`, `open`, `onOpenChange`.

Conteúdo:
1. Cabeçalho com nome, telefone formatado.
2. Lista dos 5 modelos (carregados via `useQuery` em `whatsapp_recovery_templates`, `active=true`, order by `order_index`). Cada item: título + preview de 2 linhas + radio.
3. Ao selecionar um modelo, aparece um `Textarea` editável pré-preenchido com o corpo, já com `{primeiro_nome}` substituído pelo primeiro nome do usuário.
4. Contador de caracteres (limite WhatsApp não trava, mas mostra).
5. Dois botões:
   - **"Abrir no WhatsApp"** → registra `INSERT` em `whatsapp_recovery_log` com `template_id` e `message`, depois `window.open('https://wa.me/55'+phone+'?text='+encodeURIComponent(message), '_blank')` e fecha.
   - **"Apenas marcar como enviado"** → só faz o INSERT (sem abrir).
6. Rodapé com link sutil "Editar modelos" para futura tela admin (fora do escopo agora; só placeholder roteado para `/admin/recuperacao` aba nova ou ocultar se não existir).

Após sucesso: `queryClient.invalidateQueries({ queryKey: ['admin-users-recovery-log'] })` para o badge atualizar.

### Placeholders suportados
`{nome}`, `{primeiro_nome}`, `{link_planos}` (→ `SITE_URL + '/#planos'`). Substituição feita no client antes do `Textarea` ser preenchido.

---

## 5. Modelos iniciais (seed)

1. **Lembrete amigável** — "Oi {primeiro_nome}, tudo bem? Vi que você criou conta no Música e Pinga mas ainda não escolheu um plano..."
2. **Oferta com cupom** — destaca cupom + link.
3. **Prova social** — "+X DJs já estão usando..."
4. **Última chance / urgência** — oferta encerrando.
5. **Suporte humano** — "Posso te ajudar a escolher o plano ideal?"

Textos curtos (< 400 chars), tom WhatsApp.

---

## 6. Detalhes técnicos

- Reaproveitar `Dialog` do shadcn (já com z-index corrigido).
- Telefone: validar `user.whatsapp`; se vazio, desabilitar botões e mostrar aviso.
- Mobile: `wa.me` abre app nativo automaticamente.
- Nenhuma alteração no fluxo de e-mails (`recovery-campaign-admin`, `send-recovery-emails`).
- TypeScript types do Supabase regerados automaticamente após a migration.

---

## 7. Arquivos afetados

- **Migration nova** (tabelas + grants + RLS + seed dos 5 modelos).
- `src/pages/admin/AdminUsuariosPage.tsx` — badge, filtro, integração do diálogo.
- `src/components/admin/WhatsAppRecoveryDialog.tsx` — novo.
- (opcional, segunda etapa) `src/pages/admin/AdminRecuperacaoPage.tsx` — aba "Modelos WhatsApp" para editar os 5 textos.

---

## Fora do escopo

- Envio automatizado via API do WhatsApp Business (Twilio/Sinch). Aqui é só `wa.me` manual.
- Notificações/agendamento.
- Edição dos modelos pela UI (estrutura pronta no banco; tela de edição fica para próxima etapa se quiser).

Confirma que sigo com essa abordagem? Posso também já incluir a tela de edição dos 5 modelos na mesma entrega se preferir.