import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function listDriveFiles(driveId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/google-drive`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "list", driveId }),
    }
  );

  if (!response.ok) throw new Error("Falha ao listar arquivos");
  return response.json();
}

export async function getStreamUrl(fileId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/google-drive`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "stream-url", fileId }),
    }
  );

  if (!response.ok) throw new Error("Falha ao obter URL de streaming");
  const data = await response.json();
  return data.url;
}

export async function uploadToDrive(file: File, categoryId: string, driveId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("categoryId", categoryId);
  if (driveId) formData.append("driveId", driveId);

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/google-drive`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: formData,
    }
  );

  if (!response.ok) throw new Error("Falha no upload");
  return response.json();
}
