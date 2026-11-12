import { useState } from 'react'
import { Dialog } from 'radix-ui'
import CrossGlyph from '@atlaskit/icon/core/cross'
import { MaximizeIcon, MinimizeIcon } from '@/components/ui/icons'

const CrossIcon = CrossGlyph.default ?? CrossGlyph

export function ModalHeader({ title, description, icon: Icon, busy = false, closeLabel = 'Close dialog' }) {
  const [windowSize, setWindowSize] = useState('normal')
  const toggleSize = size => setWindowSize(current => current === size ? 'normal' : size)

  return (
    <header className="dialog-header" data-window-size={windowSize}>
      <div className="dialog-window-controls" role="group" aria-label="Window controls">
        <Dialog.Close asChild>
          <button type="button" className="window-control window-close" aria-label={closeLabel} title={closeLabel} disabled={busy}>
            <span><CrossIcon label="" size="small" /></span>
          </button>
        </Dialog.Close>
        <button type="button" className="window-control window-compact" aria-label="Compact dialog" aria-pressed={windowSize === 'compact'} title="Compact dialog" onClick={() => toggleSize('compact')}>
          <span><i aria-hidden="true" /></span>
        </button>
        <button type="button" className="window-control window-expand" aria-label="Expand dialog" aria-pressed={windowSize === 'expanded'} title="Expand dialog" onClick={() => toggleSize('expanded')}>
          <span>{windowSize === 'expanded' ? <MinimizeIcon label="" size="small" /> : <MaximizeIcon label="" size="small" />}</span>
        </button>
      </div>
      <div className="editor-heading">
        {Icon && <span className="dialog-symbol" aria-hidden="true"><Icon label="" /></span>}
        <div className="dialog-heading-copy">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description className="editor-description">{description}</Dialog.Description>
        </div>
      </div>
    </header>
  )
}
