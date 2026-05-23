# Plano LGPD — Aplicar tudo

Banco já migrado: tabelas `consent_logs`, `admin_access_logs`, colunas `anonymized_at` em `profiles` e `assinaturas`.

E-mail oficial do DPO: **privacidade@musicaepinga.com.br**
Política de retenção: histórico financeiro (`assinaturas`, `pdf_purchases`) anonimizado mas mantido por 5 anos.
Cookies: modelo opt-out (continuam ativos até o usuário rejeitar).

## Arquivos a criar

### 1. `src/hooks/useCookieConsent.ts`
Hook + utilitários que leem/gravam `cookie_consent_v2` no localStorage com categorias `essential | analytics | marketing`, status `pending|accepted|rejected|custom`, versão. Registra cada decisão em `consent_logs` (com `user_id` se logado, user-agent). Exporta `acceptAll`, `rejectAll`, `setConsent`, `openPreferences`, `isCategoryAllowed` (sync), `useCookieConsent` (React).

### 2. `src/components/legal/CookiePreferencesDialog.tsx`
Dialog (shadcn) com 3 switches: Essenciais (disabled), Análise, Marketing. Botões Cancelar/Salvar. Lê estado atual; salva via `setConsent`.

### 3. `src/components/legal/PrivacyCenterCard.tsx`
Card para `ContaPage` com botões:
- **Gerenciar cookies** → abre `CookiePreferencesDialog`
- **Exportar meus dados** → chama edge `export-user-data`, baixa JSON
- **Excluir minha conta** → confirmação dupla → chama edge `delete-user-account` → signOut → redirect `/`

### 4. `supabase/functions/export-user-data/index.ts`
Autenticada (valida JWT via `supabase.auth.getUser` com anon + header). Retorna JSON consolidado: profile, assinaturas, favoritos, downloads, repertorios, repertorio_musicas, consent_logs, active_sessions, pdf_purchases. CORS habilitado.

### 5. `supabase/functions/delete-user-account/index.ts`
Autenticada. Usa service role para:
- anonimizar `profiles` (name='[anonimizado]', email='deleted_<uuid>@anon.local', whatsapp=null, cpf=null, avatar_url=null, anonymized_at=now())
- anonimizar `assinaturas` (anonymized_at=now()) — mantém por 5 anos
- anonimizar `pdf_purchases` (anonymized_at via ALTER? — vou só manter como está, pertence ao financeiro)
- apagar `favoritos`, `downloads`, `repertorio_musicas` (via repertórios), `repertorios`, `active_sessions`, `admin_push_subscriptions`, `afiliados`, `indicacoes` (referred_user_id=null)
- `supabase.auth.admin.deleteUser(user_id)`
- log em `consent_logs` (type='privacy', granted=false, version='delete')
Retorna `{ ok: true }`.

(Adicionar `anonymized_at` em `pdf_purchases` se for necessário — fica como follow-up; por ora não anonimiza essa tabela.)

## Arquivos a editar

### 6. `src/components/pixels/PixelInjector.tsx`
- Importar `useCookieConsent`.
- Meta/TikTok/Kwai/GTM/Google Ads → só injeta se `consent.marketing` (e settings habilitados).
- GA4 → só injeta se `consent.analytics`.
- Listener `cookie-consent-changed` força re-render via `useState` para remover scripts ao revogar.
- Adicionar dependências `consent.analytics` / `consent.marketing` aos `useEffect`.

### 7. `src/lib/pixels.ts`
- `dispatchEvent` lê `isCategoryAllowed("marketing")` antes de Meta/TikTok/Kwai/Google Ads e `isCategoryAllowed("analytics")` antes de GA4/GTM.
- `sendCapi` retorna sem fazer fetch se marketing desativado.

### 8. `src/pages/LoginPage.tsx`
Adicionar checkbox obrigatório no modo cadastro:
```tsx
<Checkbox required checked={acceptedTerms} onCheckedChange={setAcceptedTerms} />
Li e aceito os <Link to="/termos">Termos</Link> e a <Link to="/privacidade">Política</Link>.
```
Bloquear submit se `!acceptedTerms`. Após signUp, inserir em `consent_logs` (`terms`, `privacy`, granted=true, version=CONSENT_VERSION) usando `user.id` retornado.

### 9. `src/pages/FinalizarCadastroPage.tsx`
Mesmo checkbox + log de consentimento após `signInWithPassword`.

### 10. `src/pages/ContaPage.tsx`
Importar e renderizar `<PrivacyCenterCard />` no grid (depois do Super Admin).

### 11. `src/pages/PrivacyPage.tsx`
- Atualizar versão no topo (`Versão 1.1 — DATA`).
- Adicionar seção **"Encarregado de Proteção de Dados (DPO)"** com `privacidade@musicaepinga.com.br`.
- Adicionar `active_sessions` (user-agent) na seção "Dados que coletamos".
- Lista de subprocessadores atualizada (Meta, Google, TikTok, Kwai, Mercado Pago, Supabase, Google Drive).
- Bloco "Como exercer seus direitos" referenciando a Central de Privacidade em `/conta`.
- Mencionar política de retenção: histórico financeiro anonimizado por 5 anos.

### 12. `src/pages/LandingPage.tsx`
No rodapé, adicionar botão "Gerenciar cookies" que chama `openPreferences()` (ao lado dos links Política/Termos).

## Detalhes técnicos

- **Edge functions:** ambas usam `verify_jwt = false` no `config.toml` (padrão Lovable). JWT validado em código via `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization } } })` + `auth.getUser()`. Para operações privilegiadas, criar cliente paralelo com `SUPABASE_SERVICE_ROLE_KEY`.
- **CORS:** importar `corsHeaders` de `npm:@supabase/supabase-js@2/cors`.
- **Validação:** zod nos bodies (delete pede `confirm: "DELETAR MINHA CONTA"`).
- **Log admin:** quando admin abre `/admin/usuarios` e clica "Ver detalhes", inserir em `admin_access_logs` (`action: 'view_user'`, `target_user_id`). Implementar via chamada no clique (não migrar agora — fora do escopo crítico).

## Trecho de exemplo — gate no PixelInjector

```tsx
const { consent } = useCookieConsent();
const marketingOk = consent.status === "pending" || consent.marketing;
const analyticsOk = consent.status === "pending" || consent.analytics;

useEffect(() => {
  if (s?.meta_enabled && s.meta_pixel_id && marketingOk) {
    injectScript(...);
  } else {
    removeById(SCRIPT_IDS.meta);
    delete (window as any).fbq;
  }
}, [s?.meta_enabled, s?.meta_pixel_id, marketingOk]);
```

## Fora deste plano (pode pedir depois)
- Tela admin para visualizar `consent_logs` e `admin_access_logs`.
- Job cron para limpar `active_sessions > 90 dias`.
- Trigger automático de `admin_access_logs` em todas as views administrativas.
- Habilitar "Leaked Password Protection" no painel Supabase (1 clique manual em Auth → Policies).

Aprove para eu aplicar todas as mudanças de código.
