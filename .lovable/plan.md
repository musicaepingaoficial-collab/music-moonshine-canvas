## Banner promocional em slides no Dashboard

Adicionar um carrossel de banners (imagem + título + link) acima da seção de músicas no Dashboard, totalmente responsivo (mobile/tablet/desktop), administrado pelo Super Admin.

### Como vai parecer

- **Dashboard (`/dashboard`)**: novo componente `HeroCarousel` logo abaixo do banner "Bem-vindo de volta", antes do `ReferralBanner`. Altura adaptativa: `h-40` no mobile, `h-56` no tablet, `h-64/72` no desktop. Auto-play a cada 5s, setas (apenas no desktop), bullets de navegação, loop infinito. Cada slide é clicável (abre o link em nova aba).
- **Admin (`/admin/anuncios`)**: nova página com listagem dos banners, formulário para criar/editar (título, subtítulo opcional, link, upload de imagem, ordem, ativo/inativo) e botões de ação (editar, ativar/desativar, excluir, mover para cima/baixo).
- **AdminSidebar**: novo item "Banners" (ícone `ImagePlay`).

### Banco de dados

A tabela `anuncios` já existe com `title`, `image_url`, `link`, `active`. Migração para enriquecer:

- `anuncios.position` (`integer not null default 0`) — ordem de exibição.
- `anuncios.subtitle` (`text`) — texto secundário opcional.
- Índice em `(active, position)`.
- Bucket público `anuncios-images` para as imagens dos banners; somente admins podem fazer upload/atualizar/excluir.

### Frontend

Arquivos novos:

- `src/components/promotions/HeroCarousel.tsx` — usa `embla-carousel-react` (já instalado) + `embla-carousel-autoplay` (adicionar) com setas, dots e responsividade.
- `src/pages/admin/AdminAnunciosPage.tsx` — CRUD completo com upload via `supabase.storage.from('anuncios-images')`, drag-friendly reorder por botões ↑/↓.

Arquivos editados:

- `src/pages/DashboardPage.tsx` — incluir `<HeroCarousel />`.
- `src/components/layout/AdminSidebar.tsx` — novo item "Banners".
- `src/App.tsx` — rota `/admin/anuncios`.
- `src/types/database.ts` (se aplicável) — campos `position`, `subtitle` no tipo `Anuncio`.

### Pacotes

- `bun add embla-carousel-autoplay` (plugin oficial pequeno, mantido pela mesma equipe do embla).

### Critérios de aceite

- Carrossel aparece no Dashboard quando há ao menos 1 banner ativo; some quando não há nenhum.
- Banners passam automaticamente a cada 5s, com loop e navegação manual (setas/dots).
- Cliques no banner abrem o `link` em nova aba (quando preenchido).
- Admin consegue criar, editar, ordenar, ativar/desativar e excluir banners; imagens ficam no bucket público.
- Layout funciona bem em 360px, 768px e 1280px+ sem cortar conteúdo.

Aguardando aprovação para implementar.