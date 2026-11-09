import React from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

export default function DuplicateDialog({ duplicate, targetLabel, onMove, onClose }) {
  return (
    <AlertDialog open={!!duplicate} onOpenChange={o => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Redan skannad</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{duplicate?.item.name}</strong> ligger redan i <strong>{duplicate?.whereLabel}</strong>. Ett föremål kan bara finnas i en lista per omgång.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Behåll där</AlertDialogCancel>
          <AlertDialogAction onClick={onMove} className="bg-[#8B1E1E] hover:bg-[#6B1515]">Flytta till {targetLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}