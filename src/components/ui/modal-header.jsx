import { Dialog } from 'radix-ui'
import CrossGlyph from '@atlaskit/icon/core/cross'

const CrossIcon = CrossGlyph.default ?? CrossGlyph

export function ModalHeader({ title, description, icon: Icon, busy = false, closeLabel = 'Close dialog' }) {
  return (
    <header className="dialog-header">
      <div className="editor-heading">
        {Icon && <span className="dialog-symbol" aria-hidden="true"><Icon label="" /></span>}
        <div className="dialog-heading-copy">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description className="editor-description">{description}</Dialog.Description>
        </div>
      </div>
      <Dialog.Close asChild>
        <button type="button" className="dialog-close" aria-label={closeLabel} title={closeLabel} disabled={busy}>
          <CrossIcon label="" size="small" />
        </button>
      </Dialog.Close>
    </header>
  )
}
