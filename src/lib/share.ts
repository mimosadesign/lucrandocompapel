import { toast } from "sonner";

/**
 * Abre o WhatsApp com o texto pronto. Se o navegador bloquear o pop-up
 * (comum no iOS/in-app browsers), copia o texto para a área de transferência.
 */
export function shareWhats(texto: string, phone?: string) {
  const base = phone ? `https://wa.me/${phone}` : "https://wa.me/";
  const url = `${base}?text=${encodeURIComponent(texto)}`;
  const win = window.open(url, "_blank", "noopener");
  if (!win) {
    void navigator.clipboard
      ?.writeText(texto)
      .then(() => toast.success("Lista copiada! Cole no WhatsApp."))
      .catch(() => toast.error("Não foi possível abrir o WhatsApp."));
  }
}
