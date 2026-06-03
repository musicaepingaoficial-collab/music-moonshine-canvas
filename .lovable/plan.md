Para ajustar o fuso horário e melhorar a visualização dos dados dos usuários no menu administrativo, o plano é:

### 1. Ajuste de Fuso Horário (Interface e Banco)
- **Interface:** Atualizar a exibição de datas em todo o sistema (especialmente no Admin) para forçar o uso do locale `pt-BR` e garantir que a conversão do UTC para o horário local do navegador (que no Brasil já faz o ajuste automático de -3h) seja clara.
- **Banco de Dados:** As datas permanecerão em UTC (padrão recomendado para consistência), mas a exibição no frontend será padronizada com hora e minuto para evitar confusões.

### 2. Melhoria no Menu Super Admin (`AdminUsuariosPage`)
- **Visualização de Detalhes:** Adicionar um modal de "Detalhes do Usuário" que permita ver informações completas:
    - WhatsApp/Telefone.
    - CPF (se disponível).
    - Histórico resumido de assinaturas.
    - Data exata de cadastro com hora e minuto no padrão Brasília.
- **Novas Colunas na Tabela:**
    - Adicionar coluna de "WhatsApp" diretamente na tabela para acesso rápido.
    - Adicionar coluna de "Status" (Ativo/Inativo) baseada em assinaturas.

### Detalhes Técnicos
- **`AdminUsuariosPage.tsx`**:
    - Incluir o campo `whatsapp` e `cpf` na query do Supabase.
    - Implementar um `Dialog` do Radix UI (Shadcn) para exibir os detalhes ao clicar em um usuário.
    - Formatar `created_at` usando `toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })` para garantir a visualização correta do horário de Brasília, independente das configurações do sistema operacional do admin.
