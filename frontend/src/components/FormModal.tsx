import { Modal } from "@heroui/react";
import type { ReactNode } from "react";

export function FormModal({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  size = "md",
  dialogClassName,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "cover" | "full";
  /** Clase opcional para ensanchar el diálogo más allá del tope del tamaño elegido (p. ej. "sm:max-w-3xl"). */
  dialogClassName?: string;
}) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container scroll="inside" size={size}>
        <Modal.Dialog className={dialogClassName}>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">{children}</Modal.Body>
          {footer ? <Modal.Footer>{footer}</Modal.Footer> : null}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
