import * as React from 'react';
import { Modal, ModalDialog, DialogTitle, DialogContent, Button } from '@mui/joy';

export type TradeConfig = {
  dir: 'import' | 'export';
  conversationId?: string | null;
  exportAll?: boolean;
};

export function TradeModal(props: {
  config: TradeConfig | null;
  onClose: () => void;
}) {
  if (!props.config) return null;
  return (
    <Modal open onClose={props.onClose}>
      <ModalDialog>
        <DialogTitle>{props.config.dir === 'import' ? 'Import Conversations' : 'Export Conversations'}</DialogTitle>
        <DialogContent>
          <p>Export / Import functionality</p>
          <Button variant="soft" onClick={props.onClose} sx={{ mt: 2 }}>Close</Button>
        </DialogContent>
      </ModalDialog>
    </Modal>
  );
}
