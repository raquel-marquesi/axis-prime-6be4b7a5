import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DriveFile { id: string; name: string; mimeType: string; parents?: string[]; createdTime?: string; modifiedTime?: string; size?: string; webViewLink?: string; iconLink?: string; description?: string; }
interface UseDriveOptions { userEmail: string; }

export function useDrive({ userEmail }: UseDriveOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const callDriveFunction = useCallback(async (payload: Record<string, unknown>) => {
    if (!session?.access_token) throw new Error('Usuário não autenticado');
    const { data, error } = await supabase.functions.invoke('google-drive', { body: { ...payload, userEmail } });
    if (error) throw error;
    return data;
  }, [session, userEmail]);

  const listFiles = useCallback(async (folderId?: string, query?: string, maxResults = 50): Promise<DriveFile[]> => {
    setLoading(true); setError(null);
    try { const result = await callDriveFunction({ action: 'list', folderId, query, maxResults }); return result.files as DriveFile[]; }
    catch (err) { const message = err instanceof Error ? err.message : 'Erro ao listar arquivos'; setError(message); throw err; }
    finally { setLoading(false); }
  }, [callDriveFunction]);

  const getFile = useCallback(async (fileId: string): Promise<DriveFile> => { setLoading(true); setError(null); try { return await callDriveFunction({ action: 'get', fileId }) as DriveFile; } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callDriveFunction]);
  const createFolder = useCallback(async (name: string, parentId?: string, description?: string): Promise<DriveFile> => { setLoading(true); setError(null); try { return await callDriveFunction({ action: 'createFolder', name, parentId, description }) as DriveFile; } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callDriveFunction]);
  const updateFile = useCallback(async (fileId: string, updates: { name?: string; description?: string }): Promise<DriveFile> => { setLoading(true); setError(null); try { return await callDriveFunction({ action: 'update', fileId, ...updates }) as DriveFile; } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callDriveFunction]);
  const moveFile = useCallback(async (fileId: string, newParentId: string): Promise<DriveFile> => { setLoading(true); setError(null); try { return await callDriveFunction({ action: 'move', fileId, newParentId }) as DriveFile; } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callDriveFunction]);
  const deleteFile = useCallback(async (fileId: string): Promise<void> => { setLoading(true); setError(null); try { await callDriveFunction({ action: 'delete', fileId }); } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callDriveFunction]);
  const shareFile = useCallback(async (fileId: string, email: string, role: 'reader' | 'writer' | 'commenter' = 'reader'): Promise<void> => { setLoading(true); setError(null); try { await callDriveFunction({ action: 'share', fileId, email, role }); } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callDriveFunction]);
  const searchFiles = useCallback(async (searchTerm: string, maxResults = 50): Promise<DriveFile[]> => { setLoading(true); setError(null); try { const result = await callDriveFunction({ action: 'search', searchTerm, maxResults }); return result.files as DriveFile[]; } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callDriveFunction]);
  const createProcessFolder = useCallback(async (clientName: string, processNumber: string, folderNumber: number): Promise<{ clientFolder: DriveFile; processFolder: DriveFile }> => { setLoading(true); setError(null); try { return await callDriveFunction({ action: 'createProcessFolder', clientName, processNumber, folderNumber }) as any; } catch (err) { setError(err instanceof Error ? err.message : 'Erro'); throw err; } finally { setLoading(false); } }, [callDriveFunction]);

  return { loading, error, listFiles, getFile, createFolder, updateFile, moveFile, deleteFile, shareFile, searchFiles, createProcessFolder };
}
