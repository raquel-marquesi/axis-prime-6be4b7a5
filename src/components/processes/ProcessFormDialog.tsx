import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Process } from '@/hooks/useProcesses';

interface ProcessFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  process: Process | null;
}

export function ProcessFormDialog({ open, onOpenChange, process }: ProcessFormDialogProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (open && process) {
      onOpenChange(false);
      navigate(`/processos/${process.id}`);
    }
  }, [open, process, navigate, onOpenChange]);

  return null;
}
