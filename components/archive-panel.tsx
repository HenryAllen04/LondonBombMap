"use client";

import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ARCHIVE_EMBED_URL, ARCHIVE_URL } from "@/lib/places";

export default function ArchivePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [imageError, setImageError] = useState(false);
  const imageUrl = process.env.NEXT_PUBLIC_ARCHIVE_IMAGE_URL;
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="sheet-dialog"
      aria-labelledby="sheet-title"
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">THE LONDON ARCHIVES · 1945</p>
          <h2 id="sheet-title">Pimlico & Battersea</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close original sheet"
        >
          <X size={20} />
        </button>
      </div>
      <div className="expanded-sheet-view">
        {open &&
          (imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt="LCC bomb damage map, Sheet 88, Pimlico and Battersea"
              onError={() => setImageError(true)}
            />
          ) : (
            <iframe
              src={ARCHIVE_EMBED_URL}
              title="Original Pimlico bomb damage map"
              referrerPolicy="no-referrer"
            />
          ))}
      </div>
      <div className="dialog-footer">
        <p>Sheet 88 · Image © The London Archives (City of London)</p>
        <a href={ARCHIVE_URL} target="_blank" rel="noreferrer">
          Original record <ArrowUpRight size={14} />
        </a>
      </div>
    </dialog>
  );
}
