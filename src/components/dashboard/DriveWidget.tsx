import { useState, useEffect } from 'react';
import { FolderOpen, File, FileSpreadsheet, FileText, Image, Video, ExternalLink, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDrive } from '@/hooks/useDrive';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DriveWidgetProps { userEmail: string; onFileClick?: (file: DriveFile) => void; }
interface DriveFile { id: string; name: string; mimeType: string; parents?: string[]; createdTime?: string; modifiedTime?: string; size?: string; webViewLink?: string; iconLink?: string; }
const getFileIcon = (mimeType: string) => { if (mimeType.includes('folder')) return FolderOpen; if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet; if (mimeType.includes('document') || mimeType.includes('word')) return FileText; if (mimeType.includes('image')) return Image; if (mimeType.includes('video')) return Video; return File; };
const getFileColor = (mimeType: string): string => { if (mimeType.includes('folder')) return 'text-yellow-500'; if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'text-green-500'; if (mimeType.includes('document') || mimeType.includes('word')) return 'text-blue-500'; if (mimeType.includes('image')) return 'text-purple-500'; if (mimeType.includes('video')) return 'text-red-500'; return 'text-muted-foreground'; };
const formatFileSize = (bytes?: string): string => { if (!bytes) return ''; const size = parseInt(bytes, 10); if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; return `${(size / (1024 * 1024)).toFixed(1)} MB`; };

export function DriveWidget({ userEmail, onFileClick }: DriveWidgetProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { listFiles, searchFiles, loading, error } = useDrive({ userEmail });
  useEffect(() => { const fetchFiles = async () => { try { const result = await listFiles(undefined, undefined, 10); setFiles(result); } catch (err) { console.error('Erro ao carregar arquivos:', err); } }; fetchFiles(); }, [userEmail]);
  const handleSearch = async () => { if (!searchTerm.trim()) { const result = await listFiles(undefined, undefined, 10); setFiles(result); return; } setIsSearching(true); try { const result = await searchFiles(searchTerm, 10); setFiles(result); } catch (err) { console.error('Erro ao pesquisar:', err); } finally { setIsSearching(false); } };
  const formatDate = (dateStr?: string): string => { if (!dateStr) return ''; try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ptBR }); } catch { return ''; } };
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5 text-yellow-500" />Google Drive</CardTitle><CardDescription>Arquivos recentes</CardDescription></div></div>
        <div className="flex items-center gap-2 mt-2"><Input placeholder="Pesquisar arquivos..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="h-8 text-sm" /><Button variant="ghost" size="icon" onClick={handleSearch} disabled={isSearching} className="h-8 w-8"><Search className={`h-4 w-4 ${isSearching ? 'animate-pulse' : ''}`} /></Button></div>
      </CardHeader>
      <CardContent>
        {loading && files.length === 0 ? (<div className="space-y-2">{[1,2,3,4].map(i => (<div key={i} className="flex items-center gap-3 p-2"><Skeleton className="h-8 w-8" /><div className="flex-1"><Skeleton className="h-4 w-48 mb-1" /><Skeleton className="h-3 w-24" /></div></div>))}</div>)
        : error ? (<div className="flex items-center justify-center h-32 text-destructive"><p className="text-sm">{error}</p></div>)
        : files.length === 0 ? (<div className="flex items-center justify-center h-32 text-muted-foreground"><p className="text-sm">Nenhum arquivo encontrado</p></div>)
        : (<div className="space-y-1 max-h-[350px] overflow-y-auto pr-2">{files.map(file => { const FileIcon = getFileIcon(file.mimeType); const iconColor = getFileColor(file.mimeType); return (<div key={file.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group" onClick={() => { if (file.webViewLink) window.open(file.webViewLink, '_blank'); onFileClick?.(file); }}><div className={`p-1.5 rounded ${iconColor}`}><FileIcon className="h-5 w-5" /></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{file.name}</p><div className="flex items-center gap-2 text-xs text-muted-foreground">{file.modifiedTime && <span>{formatDate(file.modifiedTime)}</span>}{file.size && <><span>•</span><span>{formatFileSize(file.size)}</span></>}</div></div><ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></div>); })}</div>)}
      </CardContent>
    </Card>
  );
}