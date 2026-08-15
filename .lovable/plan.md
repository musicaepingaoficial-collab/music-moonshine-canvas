# Plano de Estabilização PWA e Áudio em Background

O usuário relatou que as músicas param de tocar e o app fecha sozinho quando a tela está bloqueada. Embora já tenhamos implementado a Media Session API, precisamos de garantias adicionais de que o sistema operacional (iOS/Android) não suspenda o processo do navegador ou remova o áudio da memória.

## 1. Otimização do Service Worker para PWA
Atualmente o projeto parece estar usando uma configuração básica de PWA. Precisamos garantir que o Service Worker mantenha a conexão ativa e não cause fechamentos inesperados por falta de cache de ativos críticos.

## 2. Reforço da Media Session e Wake Lock
Mesmo com Media Session, alguns sistemas suspendem abas "inativas". Vamos implementar o **Screen Wake Lock API** (quando disponível) para tentar manter o contexto de execução ativo enquanto o áudio está em reprodução.

## 3. Melhoria na Resiliência do Stream (Blobs)
Atualmente usamos `URL.createObjectURL(blob)`. Se o navegador sofrer pressão de memória em background, ele pode invalidar esses blobs.
- **Mudança:** Implementar uma estratégia de "retry" que, se o áudio falhar em background, tenta re-gerar o link de stream automaticamente sem intervenção do usuário.

## 4. Manifest e Metadados do iOS
O iOS é particularmente agressivo com PWAs em background.
- Ajustar o `manifest.json` (ou garantir que os campos `standalone` estejam corretos).
- Adicionar metadados específicos para "Audio Background" se possível via meta tags.

## Detalhes Técnicos
- **Wake Lock:** Ativar `navigator.wakeLock.request('screen')` enquanto `isPlaying` é true no `playerStore`.
- **Blob Management:** Adicionar verificação de erro 404/403 no elemento de áudio que dispara uma re-autenticação e novo fetch do stream.
- **Keep-alive:** Pequeno "silêncio" ou loop de áudio pode ser necessário se o SO ignorar a Media Session (último recurso).
