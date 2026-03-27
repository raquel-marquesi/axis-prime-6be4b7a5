import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GmailMessage { id: string; threadId: string; from?: string; to?: string; subject?: string; date?: string; snippet?: string; body?: string; }

export function useGmail({ userEmail }: { userEmail: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const callGmailFunction = useCallback(async (payload: Record<string, unknown>) => {
    if (!session?.access_token) throw new Error('Usuário não autenticado');
    const { data, error } = await supabase.functions.invoke('google-gmail', { body: { ...payload, userEmail } });
    if (error) throw error;
    return data;
  }, [session, userEmail]);

  const listMessages = useCallback(async (query?: string, maxResults = 50) => { setLoading(true); setError(null); try { const result = await callGmailFunction({ action: 'list', query, maxResults }); return result.messages as Array<{ id: string; threadId: string }>; } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callGmailFunction]);
  const getMessage = useCallback(async (messageId: string): Promise<GmailMessage> => { setLoading(true); setError(null); try { return await callGmailFunction({ action: 'get', messageId }) as GmailMessage; } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callGmailFunction]);
  const sendMessage = useCallback(async (to: string, subject: string, body: string) => { setLoading(true); setError(null); try { return await callGmailFunction({ action: 'send', to, subject, body }); } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callGmailFunction]);

  return { loading, error, listMessages, getMessage, sendMessage };
}
